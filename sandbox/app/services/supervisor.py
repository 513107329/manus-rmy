"""
Supervisor启动之后，通过一个Unix套接字文件实现通信(RPC协议)
连接这个通信文件，/tmp/supervisor.sock(xml-rpc连接)
使用某种方式进行转换，让xml-rpc实现连接supervisor.sock
连接之后我们们可以调用rpc相应的方法，getAllProcessInfo()
"""

from app.models.supervisor import SupervisorTimeout
from app.interface.errors.exceptions import BadRequestException
import threading
import asyncio
import logging
logging
from datetime import timedelta
from datetime import datetime
from app.core.config import get_settings
from app.models.supervisor import SupervisorActionResult
from app.models.supervisor import ProcessInfo
import asyncio
import socket
import http.client
import xmlrpc.client

logger = logging.getLogger(__name__)

class UnixHTTPConnection(http.client.HTTPConnection):
    def __init__(self, socket_path, host: str, timeout = None):
        http.client.HTTPConnection.__init__(self, host, timeout)
        self.socket_path = socket_path
    
    def connect(self) -> None:
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.connect(self.socket_path)

class UnixStreamTransport(xmlrpc.client.Transport):
    def __init__(self, socket_path):
        xmlrpc.client.Transport.__init__(self)
        self.socket_path = socket_path

    def make_connection(self, host) -> http.client.HTTPConnection:
        return UnixHTTPConnection(self.socket_path, host)

class SupervisorService:
    def __init__(self):
        self.rpc_url = '/tmp/supervisor.sock'
        self._connect_rpc()

        # supervisor超时配置
        settings = get_settings()
        self.timeout_active = settings.server_timeout_minutes is not None
        self.shutdown_task = None
        self.shutdown_time = None
        self._expand_enabled = True # 自动保活（每调用一次接口增加时间）

        if settings.server_timeout_minutes is not None:
            self.shutdown_time = datetime.now() + timedelta(minutes=settings.server_timeout_minutes)
            self._setup_timer(settings.server_timeout_minutes)
    
    @property
    def expand_enabled(self):
        return self._expand_enabled

    def enable_expand(self):
        self._expand_enabled = True

    def disable_expand(self):
        self._expand_enabled = False

    def _setup_timer(self, minutes):
        if self.shutdown_task:
            try:
                self.shutdown_task.cancel()
            except Exception as e:
                logger.warning(f"取消任务失败")
        
        async def shutdown_after_timeout():
            await asyncio.sleep(minutes * 60)
            await self.shutdown()
        
        try:
            loop = asyncio.get_event_loop()
            self.shutdown_task = loop.create_task(shutdown_after_timeout())
        except Exception as e:
            if hasattr(self, "shutdown_task") and self.shutdown_task:
                self.shutdown_task.cancel()
            self.shutdown_task = threading.Timer(
                minutes * 60,
                lambda: asyncio.run(self.shutdown())
            )
            self.shutdown_task.daemon = True
            self.shutdown_task.start()
            

    def _connect_rpc(self):
        try:
            self.server = xmlrpc.client.ServerProxy("http://localhost", transport=UnixStreamTransport(self.rpc_url))
        except Exception as e:
            raise Exception(f"连接supervisor失败: {e}")
    
    async def _call_rpc(self, method, *args):
        try:
            return await asyncio.to_thread(method, *args)
        except Exception as e:
            raise Exception(f"调用supervisor失败: {e}")

    async def get_all_status(self):
        try:
            process_info = await self._call_rpc(self.server.supervisor.getAllProcessInfo)
            return [ProcessInfo(**info) for info in process_info]
        except Exception as e:
            raise Exception(f"获取supervisor状态失败: {e}")
    
    async def stop_all_process(self):
        try:
            result = await self._call_rpc(self.server.supervisor.stopAllProcesses)
            return SupervisorActionResult(status="stopped", stop_result=result)
        except Exception as e:
            raise Exception(f"停止supervisor管理的所有进程失败: {e}")
    
    async def start_all_process(self):
        try:
            result = await self._call_rpc(self.server.supervisor.startAllProcesses)
            return SupervisorActionResult(status="started", start_result=result)
        except Exception as e:
            raise Exception(f"启动supervisor管理的所有进程失败: {e}")
    
    async def shutdown(self):
        try:
            result = await self._call_rpc(self.server.supervisor.shutdown)
            return SupervisorActionResult(status="shutdown", shutdown_result=result)
        except Exception as e:
            raise Exception(f"关闭supervisor管理的所有进程失败: {e}")

    async def restart(self):
        try:
            stop_result = await self._call_rpc(self.server.supervisor.stopAllProcesses)
            start_result = await self._call_rpc(self.server.supervisor.startAllProcesses)
            return SupervisorActionResult(status="restarted", stop_result=stop_result, start_result=start_result)
        except Exception as e:
            raise Exception(f"重启supervisor管理的所有进程失败: {e}")

    async def active_timeout(self, minutes: int):
        settings = get_settings()
        timeout_minutes = minutes or settings.server_timeout_minutes
        if timeout_minutes is None:
            raise BadRequestException(f"超时时间未设置，并且未读取到系统默认的超时时间")
        
        self.timeout_active = True
        self.shutdown_time =  datetime.now() + timedelta(minutes=timeout_minutes)
        
        self._setup_timer(timeout_minutes)

        return SupervisorTimeout(
            status="timeout_activited",
            active=True,
            shutdown_time=self.shutdown_time.isoformat(),
            timeout_minutes=timeout_minutes,
            remaining_seconds=(self.shutdown_time - datetime.now()).total_seconds()
        )
    async def extend_timeout(self, minutes: int):
        if minutes is None:
            raise BadRequestException(f"超时时间未设置，并且未读取到系统默认的超时时间")
        remaining = self.shutdown_time - datetime.now()
        timeout_minutes = round(max(0, remaining.total_seconds()) / 60) + minutes

        self.timeout_active = True
        self.shutdown_time =  datetime.now() + timedelta(minutes=timeout_minutes)
        
        self._setup_timer(timeout_minutes)

        return SupervisorTimeout(
            status="timeout_extended",
            active=True,
            shutdown_time=self.shutdown_time.isoformat(),
            timeout_minutes=timeout_minutes,
            remaining_seconds=(self.shutdown_time - datetime.now()).total_seconds()
        )
    
    async def cancel_timeout(self):
        if not self.timeout_active:
            return SupervisorTimeout(
                status="no_timeout_active",
                active=False
            )

        if self.shutdown_task:
            try:
                self.shutdown_task.cancel()
                self.shutdown_task = None
            except Exception as e:
                logger.warning(f"取消shutdown任务失败")

        self.timeout_active = False
        self.shutdown_time = None
        self._expand_enabled = True

        return SupervisorTimeout(
            status="timeout_cancelled",
            active=False
        )

    async def get_timeout_status(self):
        if not self.timeout_active:
            return SupervisorTimeout(active=False)
        
        remaining_seconds = 0
        if self.shutdown_time:
            remaining = self.shutdown_time - datetime.now()
            remaining_seconds = max(0, remaining.total_seconds())
        
        return SupervisorTimeout(
            active=self.timeout_active,
            shutdown_time=self.shutdown_time.isoformat() if self.shutdown_time else None,
            remaining_seconds=remaining_seconds
        )