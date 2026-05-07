from app.interface.errors.exceptions import BadRequestException
from app.models.file import FileWriteResult
from app.interface.errors.exceptions import AppException
import asyncio
from sys import stdout
import sys
from app.interface.errors.exceptions import NotFoundException
from app.models.file import FileReadResult
from typing import Optional
import os


class FileService:
    async def read_file(
        self,
        filepath: str,
        start_line: Optional[int],
        end_line: Optional[int],
        sudo: bool,
    ) -> FileReadResult:
        try:
            if not os.path.exists(filepath):
                raise NotFoundException(f"文件 {filepath} 不存在或者无权限")

            encoding = "utf-8"
            if sudo:
                command = f"sudo cat '{filepath}'"
                process = await asyncio.create_subprocess_shell(
                    command,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await process.communicate()
                if process.returncode and process.returncode != 0:
                    raise AppException(f"读取文件失败: {stderr.decode(encoding)}")

                content = stdout.decode(encoding, errors="replace")
            else:

                def async_read_file() -> str:
                    try:
                        with open(filepath, "r", encoding="utf-8") as f:
                            return f.read()
                    except Exception as e:
                        raise AppException(f"读取文件失败: {str(e)}")

                content = await asyncio.to_thread(async_read_file)

            if start_line is not None or end_line is not None:
                lines = content.splitlines()
                start = start_line if start_line is not None else 0
                end = end_line if end_line is not None else len(lines)
                content = "\n".join(lines[start:end])
            return FileReadResult(filepath=filepath, content=content)
        except Exception as e:
            if isinstance(e, AppException) or isinstance(e, BadRequestException):
                raise
            raise AppException(f"读取文件失败: {str(e)}")

    async def write_file(
        self,
        filepath: str,
        content: str,
        append: bool,
        leading_newline: bool,
        trailing_newline: bool,
        sudo: bool,
    ) -> FileWriteResult:
        try:
            if leading_newline:
                content = "\n" + content
            if trailing_newline:
                content = content + "\n"

            if sudo:
                mode = ">>" if append else ">"
                temp_file = f"/tmp/file_wrie_{os.getpid()}.tmp"

                def async_write_to_file() -> int:
                    with open(temp_file, "w", encoding="utf-8") as f:
                        f.write(content)
                    return len(content.encode("utf-8"))

                bytes_written = await asyncio.to_thread(async_write_to_file)

                command = f'sudo bash -c "cat {temp_file} {mode} {filepath}"'
                process = await asyncio.create_subprocess_shell(
                    command,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await process.communicate()
                os.unlink(temp_file)
                if process.returncode and process.returncode != 0:
                    raise BadRequestException(f"写入文件失败: {stderr.decode('utf-8')}")
            else:
                os.makedirs(os.path.dirname(filepath), exist_ok=True)

                def async_write_file() -> int:
                    try:
                        with open(
                            filepath, "w" if not append else "a", encoding="utf-8"
                        ) as f:
                            return f.write(content)
                    except Exception as e:
                        raise BadRequestException(f"写入文件失败: {str(e)}")

                bytes_written = await asyncio.to_thread(async_write_file)
            return FileWriteResult(filepath=filepath, bytes_written=bytes_written)
        except Exception as e:
            if isinstance(e, BadRequestException):
                raise
            raise AppException(f"写入文件失败: {str(e)}")
