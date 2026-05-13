from app.models.file import FileExistsResult
from app.models.file import FileDeleteResult
from app.models.file import FileUploadResult
from fastapi.datastructures import UploadFile
from fnmatch import fnmatch
from app.models.file import FileFindResult
from app.models.file import FileSearchResult
from app.models.file import FileReplaceResult
from app.interface.errors.exceptions import BadRequestException
from app.models.file import FileWriteResult
from app.interface.errors.exceptions import AppException
import asyncio
from sys import stdout
from app.interface.errors.exceptions import NotFoundException
from app.models.file import FileReadResult
from typing import Optional
import os
import re
import glob


class FileService:
    async def read_file(
        self,
        filepath: str,
        start_line: Optional[int] = None,
        end_line: Optional[int] = None,
        sudo: Optional[bool] = False,
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

    async def replace_in_file(
        self,
        filepath: str,
        old_content: str,
        new_content: str,
        sudo: bool = False,
    ) -> FileReplaceResult:
        try:
            result = await self.read_file(filepath, sudo=sudo)
            replace_count = result.content.count(old_content)

            if replace_count == 0:
                return FileReplaceResult(filepath=filepath, replace_count=0)
            content = result.content.replace(old_content, new_content)
            result = await self.write_file(filepath, content, False, False, False, sudo)
            return FileReplaceResult(
                filepath=filepath,
                replace_count=replace_count,
            )
        except Exception as e:
            if isinstance(e, BadRequestException):
                raise
            raise AppException(f"替换文件失败: {str(e)}")

    async def search_in_file(
        self,
        filepath: str,
        regex: str,
        sudo: bool = False,
    ) -> FileSearchResult:
        try:
            line_numbers = []
            matches = []
            result = await self.read_file(filepath, sudo=sudo)
            content = result.content
            pattern = re.compile(regex)

            def async_matches():
                nonlocal matches, line_numbers
                print(content.splitlines(), regex)
                for line_number, line in enumerate(content.splitlines()):
                    if pattern.search(line):
                        matches.append(line)
                        line_numbers.append(line_number)

            await asyncio.to_thread(async_matches)
            return FileSearchResult(
                filepath=filepath, matches=matches, line_numbers=line_numbers
            )
        except Exception as e:
            if isinstance(e, BadRequestException):
                raise
            raise AppException(f"搜索文件失败: {str(e)}")

    async def find_files(self, dir_path: str, glob_pattern: str) -> FileFindResult:
        if not os.path.exists(dir_path):
            raise NotFoundException(f"目录 {dir_path} 不存在")

        def async_glob():
            search_pattern = os.path.join(dir_path, glob_pattern)
            file_list = glob.glob(search_pattern, recursive=True)
            return file_list

        files = await asyncio.to_thread(async_glob)
        return FileFindResult(dir_path=dir_path, file_list=files)

    async def upload_file(self, file: UploadFile, filepath: str) -> FileUploadResult:
        try:
            chunk_size = 1024 * 8
            file_size = 0
            os.makedirs(os.path.dirname(filepath), exist_ok=True)

            def async_write_file():
                nonlocal file_size
                with open(filepath, "wb") as f:
                    while True:
                        chunk = file.file.read(chunk_size)
                        if not chunk:
                            break
                        f.write(chunk)
                        file_size += len(chunk)

            await asyncio.to_thread(async_write_file)
            return FileUploadResult(
                filepath=filepath, success=True, file_size=file_size
            )
        except Exception as e:
            raise AppException(f"上传文件到沙箱失败：{str(e)}")

    async def ensure_file_exists(self, filepath: str):
        if not os.path.exists(filepath):
            raise NotFoundException(f"文件 {filepath} 不存在")

    async def check_file_exists(self, filepath: str) -> FileExistsResult:
        return FileExistsResult(filepath=filepath, exists=os.path.exists(filepath))

    async def delete_file(self, filepath: str, sudo: bool = False) -> FileDeleteResult:
        await self.ensure_file_exists(filepath)
        try:
            if sudo:
                command = f"rm {filepath}"
                process = await asyncio.create_subprocess_shell(
                    command,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await process.communicate()
                if process.returncode and process.returncode != 0:
                    raise BadRequestException(f"删除文件失败: {stderr.decode('utf-8')}")
            else:
                os.remove(filepath)
            return FileDeleteResult(filepath=filepath, success=True)
        except Exception as e:
            if isinstance(e, BadRequestException):
                raise
            raise AppException(f"删除文件失败: {str(e)}")
