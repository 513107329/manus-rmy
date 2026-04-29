from typing import _Self
from app.domain.external.browser import Browser
from typing import BinaryIO
from typing import Optional
from app.domain.models.tool_result import ToolResult
from typing import Protocol


class Sandbox(Protocol):
    """沙箱服务扩展协议，包含文件工具协议、shell工具协议以及沙箱本身的扩展"""

    async def exec_command(
        self, session_id: str, exec_dir: str, command: str
    ) -> ToolResult: ...

    async def view_shell(
        self, session_id: str, console: bool = False
    ) -> ToolResult: ...

    async def wait_for_process(
        self, session_id: str, seconds: Optional[str] = None
    ) -> ToolResult: ...

    async def write_to_process(
        self, session_id: str, input_text: str, press_enter: bool = False
    ) -> ToolResult: ...

    async def kill_process(self, session_id: str) -> ToolResult: ...

    async def file_write(
        self,
        filepath: str,
        content: str,
        append: bool = False,
        leading_newline: bool = False,
        trailing_newline: bool = False,
        sudo: bool = False,
    ) -> ToolResult: ...

    async def file_read(
        self,
        filepath: str,
        start_line: Optional[int] = None,
        end_line: Optional[int] = None,
        sudo: bool = False,
    ) -> ToolResult: ...

    async def file_exist(self, file_path: str) -> ToolResult: ...
    async def file_delete(self, file_path: str) -> ToolResult: ...
    async def file_list(self, dir_path: str) -> ToolResult: ...
    async def file_replace(
        self, file_path: str, old_str: str, new_str: str, sudo: bool = False
    ) -> ToolResult: ...
    async def file_search(
        self, file_path: str, regex: str, sudo: bool = False
    ) -> ToolResult: ...
    async def file_find(self, dir_path: str, glob_pattern: str) -> ToolResult: ...
    async def file_upload(
        self, file_data: BinaryIO, filepath: str, filename: str
    ) -> ToolResult: ...
    async def file_download(self, filepath: str) -> BinaryIO: ...
    async def _ensure_sandbox_exists(self) -> None: ...
    async def destroy(self) -> bool: ...
    async def get_browser(self) -> Browser: ...

    @property
    def id(self) -> str: ...

    @property
    def cdp_url(self) -> str: ...

    @property
    def vnc_url(self) -> str: ...

    @classmethod
    async def create(cls) -> _Self: ...

    @classmethod
    async def get(cls, id: str) -> _Self: ...
