from typing import List
from app.models.shell import ShellViewResult
from app.models.shell import WaitProcessResult
from app.interface.errors.exceptions import NotFoundException
import codecs
import shutil
import shutil
import sys
from app.interface.errors.exceptions import AppException
import logging
import asyncio
import asyncio
from app.models.shell import ConsoleRecord
from typing import Dict
import socket
from getpass import getpass
from app.interface.errors.exceptions import BadRequestException
from app.models.shell import ShellExecResult
import uuid
import os
from app.models.shell import Shell
import re

logger = logging.getLogger(__name__)


class ShellService:

    active_shells: Dict[str, Shell] = {}

    @classmethod
    def create_session_id(cls) -> str:
        return str(uuid.uuid4())

    def _get_display_path(self, exec_dir: str) -> str:
        home_dir = os.path.expanduser("~")
        if exec_dir.startswith(home_dir):
            return exec_dir.replace(home_dir, "~", 1)
        return exec_dir

    def _format_ps1(self, exec_dir: str) -> str:
        username = getpass.getuser()
        hostname = socket.gethostname()
        display_dir = self._get_display_path(exec_dir)
        return f"{username}@{hostname}:{display_dir}"

    async def _read_output(self, session_id: str, process: asyncio.subprocess.Process):
        if sys.platform == "win32":
            encoding = "gb18030"
        else:
            encoding = "utf-8"

        shell = self.active_shells[session_id]
        decoder = codecs.getincrementaldecoder(encoding)(errors="replace")
        while True:
            if process.stdout:
                try:
                    output = await process.stdout.read(4096)
                    if not output:
                        break
                    code = decoder.decode(output, final=False)
                    if shell:
                        shell.output += code
                        if shell.console_records:
                            shell.console_records[-1].output += code
                except Exception as e:
                    logger.error(f"读取shell输出失败: {e}")
                    break
            else:
                break

    async def wait_for_process(
        self, session_id: str, seconds: int
    ) -> WaitProcessResult:
        shell = self.active_shells[session_id]
        if shell:
            process = shell.process
            try:
                seconds = 60 if seconds is None or seconds <= 0 else seconds

                await asyncio.wait_for(process.wait(), timeout=seconds)
                return WaitProcessResult(returncode=process.returncode)
            except asyncio.TimeoutError:
                raise BadRequestException("shell会话进程等待超时")
            except Exception as e:
                logger.error(f"等待shell进程失败: {e}")
                raise AppException("等待shell进程失败")
        else:
            raise NotFoundException("会话不存在")

    async def _create_process(
        self, exec_dir: str, command: str
    ) -> asyncio.subprocess.Process:
        shell_exec = None
        if sys.platform != "win32":
            if os.path.exists("/bin/bash"):
                shell_exec = "/bim/bash"
            elif os.path.exists("/bin/zsh"):
                shell_exec = "/bin/zsh"
        else:
            shell_exec = shutil.which("powershell")

            if not shell_exec:
                shell_exec = shutil.which("cmd")

            if not shell_exec:
                raise AppException("未找到可用的shell")

        return await asyncio.create_subprocess_shell(
            command,
            executable=shell_exec,
            cwd=exec_dir,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            limit=1024 * 1024,
        )

    def _remove_ansi_escape_codes(self, text: str) -> str:
        ansi_escape = re.compile(
            r"\x1B(?:[@-Z\-_]|[\[\]#?])(?:[0-9]{1,4}(?:;[0-9]{1,4})*)?[A-PR-Z]"
        )
        return ansi_escape.sub("", text)

    def _get_console_records(self, session_id: str) -> List[ConsoleRecord]:
        shell = self.active_shells[session_id]
        clean_console_records = []

        for console_record in shell.console_records:
            clean_console_records.append(
                ConsoleRecord(
                    ps1=console_record.ps1,
                    command=console_record.command,
                    output=self._remove_ansi_escape_codes(console_record.output),
                )
            )
        return clean_console_records

    async def view_shell(self, session_id: str) -> ShellViewResult:
        shell = self.active_shells[session_id]
        if shell:
            raw_output = shell.output
            clean_output = self._remove_ansi_escape_codes(raw_output)
            console_records = self._get_console_records(session_id)
            return ShellViewResult(
                session_id=session_id,
                output=clean_output,
                console_records=console_records,
            )
        else:
            raise NotFoundException("会话不存在")

    async def exec_command(
        self, session_id: str, command: str, exec_dir: str
    ) -> ShellExecResult:
        if not exec_dir or exec_dir == "":
            exec_dir = os.path.expanduser("~")

        if not os.path.exists(exec_dir):
            raise BadRequestException(f"目录 {exec_dir} 不存在")

        try:
            ps1 = self._format_ps1(exec_dir)

            if session_id not in self.active_shells:
                process = await self._create_process(exec_dir, command)
                self.active_shells[session_id] = Shell(
                    process=process,
                    exec_dir=exec_dir,
                    output="",
                    console_records=[
                        ConsoleRecord(ps1=ps1, command=command, output="")
                    ],
                )
                asyncio.create_task(self._read_output(session_id, process))
            else:
                shell = self.active_shells[session_id]
                old_process = shell.process

                if old_process.returncode is None:
                    try:
                        old_process.terminate()
                        await asyncio.wait_for(old_process.wait(), timeout=1.0)
                    except Exception:
                        old_process.kill()
                        await asyncio.wait_for(old_process.wait(), timeout=1.0)

                new_process = await self._create_process(exec_dir, command)
                shell.process = new_process
                shell.output = ""
                shell.console_records.append(
                    ConsoleRecord(ps1=ps1, command=command, output="")
                )
                asyncio.create_task(self._read_output(session_id, new_process))

            try:
                wait_result = await self.wait_for_process(session_id, seconds=5)
                if wait_result.returncode is not None:
                    logger.debug("Shell会话进程已结束")
                    view_result = await self.view_shell(session_id)
                    return ShellExecResult(
                        session_id=session_id,
                        command=command,
                        status="completed",
                        returncode=wait_result.returncode,
                        stdout=view_result.output,
                        stderr="",
                    )
            except Exception as e:
                return ShellExecResult(
                    session_id=session_id, command=command, status="running"
                )

        except Exception as e:
            raise AppException(
                msg="命令执行失败", data={"session_id": session_id, command: command}
            )
