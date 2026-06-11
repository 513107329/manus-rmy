from typing import BinaryIO, Self
from fastapi import UploadFile
import logging
from app.domain.models.tool_result import ToolResult
from app.infrastructure.external.browser.playwright_browser import PlayWrightBrowser
from app.domain.external.browser import Browser
import uuid
import asyncio
from core.config import get_settings
import httpx
import socket
from typing import Optional
from app.domain.external.sandbox import Sandbox
from async_lru import alru_cache
import docker
import io

logger = logging.getLogger(__name__)


class DockerSandbox(Sandbox):
    def __init__(self, ip: Optional[str] = None, container_name: Optional[str] = None):
        self.client = httpx.AsyncClient(timeout=600)
        self._ip = ip
        self._container_name = container_name
        self._base_url = f"http://{self._ip}:8000"
        self._cdp_url = f"http://{self._ip}:9222"
        self._vnc_url = f"http://{self._ip}:5900"

    @property
    def id(self) -> str:
        if self._container_name is None:
            return "manus-sandbox"
        return self._container_name

    @property
    def cdp_url(self) -> str:
        return self._cdp_url

    @property
    def vnc_url(self) -> str:
        return self._vnc_url

    @classmethod
    @alru_cache(maxsize=128, typed=True)
    async def _resolve_hostname_to_ip(cls, hostname: str) -> str:
        try:
            try:
                socket.inet_pton(socket.AF_INET, hostname)
                return hostname
            except OSError:
                pass

            addr_info = socket.getaddrinfo(hostname, None, family=socket.AF_INET)
            if addr_info and len(addr_info) > 0:
                return addr_info[0][4][0]
            else:
                return None
        except Exception as e:
            raise ValueError(f"Failed to resolve hostname {hostname}: {e}")
            return None

    @classmethod
    def _get_container_ip(cls, container: docker.models.containers.Container) -> str | None:
        network_settings = container.attrs.get("NetworkSettings", {})
        ip = network_settings.get("IPAddress")
        if not ip:
            for network in network_settings.get("Networks", {}).values():
                ip = network.get("IPAddress")
                if ip:
                    break
        return ip

    @classmethod
    def _create_task(cls) -> Self:
        settings = get_settings()

        image = settings.sandbox_image
        name_prefix = settings.sandbox_name_prefix
        container_name = f"{name_prefix}-{uuid.uuid4()}"

        try:
            client = docker.from_env()
            container_config = {
                "image": image,
                "name": container_name,
                "detach": True,
                "remove": True,
                "ports": {
                    "8000/tcp": 8000,
                    "9222/tcp": 9222,
                    "5900/tcp": 5900,
                    "5901/tcp": 5901,
                },
                "environment": {
                    "SERVICE_TIMEOUT_MINUTES": settings.sandbox_ttl_minutes,
                    "CHROME_ARGS": settings.sandbox_chrome_args,
                    "HTTPS_PROXY": settings.sandbox_https_proxy,
                    "HTTP_PROXY": settings.sandbox_http_proxy,
                    "NO_PROXY": settings.sandbox_no_proxy,
                },
                "volumes": {
                    "/dev/shm": {
                        "bind": "/dev/shm",
                        "mode": "rw",
                    }
                },
            }

            if settings.sandbox_network:
                container_config["network"] = settings.sandbox_network

            container = client.containers.run(**container_config)
            container.reload()
            logger.info(f"Sandbox container {container_name} created")
            ip = cls._get_container_ip(container)
            logger.info(f"Sandbox container {container_name} IP: {ip}")
            return cls(ip="127.0.0.1", container_name=container_name)
        except Exception as e:
            logger.error(f"Failed to create sandbox: {e}")
            raise Exception(f"Failed to create sandbox: {e}")

    @classmethod
    async def create(cls) -> Self:
        settings = get_settings()

        if settings.sandbox_address:
            ip = await cls._resolve_hostname_to_ip(settings.sandbox_address)
            return cls(ip="127.0.0.1", container_name=settings.sandbox_name_prefix)

        return await asyncio.to_thread(cls._create_task)

    async def destroy(self) -> bool:
        try:
            if self.client:
                await self.client.aclose()

            if self._container_name:
                container = docker.from_env().containers.get(self._container_name)
                container.stop(timeout=5)
                container.remove(force=True)
            return True
        except Exception as e:
            raise Exception(f"Failed to destroy sandbox: {e}")

    @classmethod
    async def get(cls, id: str) -> Optional[Self]:
        settings = get_settings()
        if settings.sandbox_address:
            try:
                ip = await cls._resolve_hostname_to_ip(settings.sandbox_address)
                return cls(ip=ip, container_name=settings.sandbox_name_prefix)
            except Exception as e:
                logger.error(f"Failed to get sandbox: {e}")
                return None

        try:
            docker_client = docker.from_env()
            try:
                container = docker_client.containers.get(id)
                container.reload()

                if container.status != "running":
                    logger.error(f"Sandbox container {id} is not running")
                    return None

                ip = cls._get_container_ip(container)

                if not ip:
                    logger.error(f"Sandbox container {id} has no IP address")
                    return None

                return cls(ip='127.0.0.1', container_name=id)
            except docker.errors.NotFound:
                logger.error(f"Sandbox container {id} not found")
                return None
            except docker.errors.APIError as e:
                logger.error(f"Failed to get sandbox: {e}")
                return None
            finally:
                docker_client.close()
        except Exception as e:
            logger.error(f"Failed to get sandbox: {e}")
            return None

    async def get_browser(self) -> Browser:
        return PlayWrightBrowser(self.cdp_url)

    async def _ensure_sandbox_exists(self) -> None:
        max_retries = 30
        retry_interval = 2
        for attempt in range(max_retries):
            try:
                response = await self.client.get(
                    f"{self._base_url}/api/supervisor/status"
                )
                response.raise_for_status()
                tool_result = ToolResult.from_sandbox(**response.json())

                if not tool_result.success:
                    logger.warning(
                        f"无法确认sandbox Supervisor状态, {str(tool_result.message)}"
                    )
                    await asyncio.sleep(retry_interval)
                    continue

                services = tool_result.data or []

                if not services:
                    logger.warning("sandbox Supervisor进程中未发现任何服务")
                    await asyncio.sleep(retry_interval)
                    continue

                all_running = True
                non_runnning_services = []

                for service in services:
                    if service.get("statename") != "RUNNING":
                        all_running = False
                        non_runnning_services.append(service.get("name"))

                if not all_running:
                    logger.warning(
                        f"sandbox Supervisor进程中存在未运行的服务: {non_runnning_services}"
                    )
                    await asyncio.sleep(retry_interval)
                    continue

                return
            except Exception as e:
                if attempt == max_retries - 1:
                    raise Exception(f"Failed to ensure sandbox: {e}")
                await asyncio.sleep(retry_interval)

    # file模块方法
    async def file_read(
        self,
        filepath: str,
        start_line: Optional[int] = None,
        end_line: Optional[int] = None,
        sudo: Optional[bool] = False,
    ) -> ToolResult:
        response = await self.client.post(
            f"{self._base_url}/api/file/read-file",
            json={
                "filepath": filepath,
                "start_line": start_line,
                "end_line": end_line,
                "sudo": sudo,
            },
        )
        response.raise_for_status()
        tool_result = ToolResult.from_sandbox(**response.json())
        return tool_result

    async def file_write(
        self,
        filepath: str,
        content: str,
        append: bool = False,
        leading_newline: bool = False,
        trailing_newline: bool = False,
        sudo: bool = False,
    ) -> ToolResult:
        response = await self.client.post(
            f"{self._base_url}/api/file/write-file",
            json={
                "filepath": filepath,
                "content": content,
                "append": append,
                "leading_newline": leading_newline,
                "trailing_newline": trailing_newline,
                "sudo": sudo,
            },
        )
        response.raise_for_status()
        tool_result = ToolResult.from_sandbox(**response.json())
        return tool_result

    async def file_replace(
        self,
        filepath: str,
        old_str: str,
        new_str: str,
        sudo: bool = False,
    ) -> ToolResult:
        response = await self.client.post(
            f"{self._base_url}/api/file/replace-in-file",
            json={
                "filepath": filepath,
                "old_content": old_str,
                "new_content": new_str,
                "sudo": sudo,
            },
        )
        response.raise_for_status()
        tool_result = ToolResult.from_sandbox(**response.json())
        return tool_result

    async def file_search(
        self,
        filepath: str,
        regex: str,
        sudo: bool = False,
    ) -> ToolResult:
        response = await self.client.post(
            f"{self._base_url}/api/file/search-in-file",
            json={
                "filepath": filepath,
                "regex": regex,
                "sudo": sudo,
            },
        )
        response.raise_for_status()
        tool_result = ToolResult.from_sandbox(**response.json())
        return tool_result

    async def file_find(self, dirpath: str, glob_pattern: str) -> ToolResult:
        response = await self.client.post(
            f"{self._base_url}/api/file/find-files",
            json={
                "dir_path": dirpath,
                "glob_pattern": glob_pattern,
            },
        )
        response.raise_for_status()
        tool_result = ToolResult.from_sandbox(**response.json())
        return tool_result

    async def file_list(self, dirpath: str) -> ToolResult:
        return await self.file_find(dirpath, "*")

    async def file_upload(
        self, file_data: BinaryIO, filepath: str, filename: str
    ) -> ToolResult:
        response = await self.client.post(
            f"{self._base_url}/api/file/upload-file",
            json={
                "file": file_data,
                "filepath": filepath,
                "filename": filename,
            },
        )
        tool_result = ToolResult.from_sandbox(**response.json())
        return tool_result

    async def check_file_exists(self, filepath: str) -> ToolResult:
        response = await self.client.post(
            f"{self._base_url}/api/supervisor/check-file-exists",
            json={
                "filepath": filepath,
            },
        )
        response.raise_for_status()
        tool_result = ToolResult.from_sandbox(**response.json())
        return tool_result

    async def file_delete(self, filepath: str, sudo: bool = False) -> ToolResult:
        response = await self.client.post(
            f"{self._base_url}/api/supervisor/delete-file",
            json={
                "filepath": filepath,
                "sudo": sudo,
            },
        )
        response.raise_for_status()
        tool_result = ToolResult.from_sandbox(**response.json())
        return tool_result

    async def file_download(self, filepath: str, sudo: bool = False) -> ToolResult:
        response = await self.client.post(
            f"{self._base_url}/api/supervisor/download-file",
            json={
                "filepath": filepath,
                "sudo": sudo,
            },
        )
        response.raise_for_status()
        return io.BytesIO(response.content)

    # shell模块
    async def exec_command(
        self, session_id: str, exec_dir: str, command: str
    ) -> ToolResult:
        response = await self.client.post(
            f"{self._base_url}/api/shell/exec-command",
            json={
                "session_id": session_id,
                "command": command,
                "exec_dir": exec_dir,
            },
        )
        response.raise_for_status()
        tool_result = ToolResult.from_sandbox(**response.json())
        return tool_result

    async def view_shell(self, session_id: str, console: bool = False) -> ToolResult:
        response = await self.client.post(
            f"{self._base_url}/api/shell/view_shell",
            json={
                "session_id": session_id,
                "console": console,
            },
        )
        response.raise_for_status()
        tool_result = ToolResult.from_sandbox(**response.json())
        return tool_result

    async def wait_for_process(
        self, session_id: str, seconds: Optional[str] = None
    ) -> ToolResult:
        response = await self.client.post(
            f"{self._base_url}/api/shell/wait_for_process",
            json={
                "session_id": session_id,
                "seconds": seconds,
            },
        )
        response.raise_for_status()
        tool_result = ToolResult.from_sandbox(**response.json())
        return tool_result

    async def write_to_process(
        self, session_id: str, input_text: str, press_enter: bool = False
    ) -> ToolResult:
        response = await self.client.post(
            f"{self._base_url}/api/shell/write-to-process",
            json={
                "session_id": session_id,
                "inputText": input_text,
                "enter": press_enter,
            },
        )
        response.raise_for_status()
        tool_result = ToolResult.from_sandbox(**response.json())
        return tool_result

    async def kill_process(self, session_id: str) -> ToolResult:
        response = await self.client.post(
            f"{self._base_url}/api/shell/kill-process",
            json={
                "session_id": session_id,
            },
        )
        response.raise_for_status()
        tool_result = ToolResult.from_sandbox(**response.json())
        return tool_result
