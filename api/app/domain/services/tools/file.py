from app.domain.models.tool_result import ToolResult
from app.domain.external.sandbox import Sandbox
from app.domain.services.tools.base import BaseTool, tool


class FileTool(BaseTool):
    name: str = "file"

    def __init__(self, sandbox: Sandbox):
        super().__init__()
        self.sandbox = sandbox

    @tool(
        name="file_write",
        description="向指定shell会话中写入文件",
        params={
            "filepath": {
                "type": "string",
                "description": "要写入的文件路径",
            },
            "content": {
                "type": "string",
                "description": "要写入的内容",
            },
            "append": {
                "type": "boolean",
                "description": "是否追加内容",
            },
            "leading_newline": {
                "type": "boolean",
                "description": "是否添加前导换行符",
            },
            "trailing_newline": {
                "type": "boolean",
                "description": "是否添加尾随换行符",
            },
            "sudo": {
                "type": "boolean",
                "description": "是否使用sudo权限",
            },
        },
        required=["filepath", "content"],
    )
    async def file_write(
        self,
        filepath: str,
        content: str,
        append: bool = False,
        leading_newline: bool = False,
        trailing_newline: bool = False,
        sudo: bool = False,
    ) -> ToolResult:
        return await self.sandbox.file_write(
            filepath=filepath,
            content=content,
            append=append,
            leading_newline=leading_newline,
            trailing_newline=trailing_newline,
            sudo=sudo,
        )

    @tool(
        name="file_read",
        description="从指定shell会话中读取文件",
        params={
            "filepath": {
                "type": "string",
                "description": "要读取的文件路径",
            },
            "start_line": {
                "type": "integer",
                "description": "开始行",
            },
            "end_line": {
                "type": "integer",
                "description": "结束行",
            },
            "sudo": {
                "type": "boolean",
                "description": "是否使用sudo权限",
            },
        },
        required=["filepath"],
    )
    async def file_read(
        self,
        filepath: str,
        start_line: int = 1,
        end_line: int = -1,
        sudo: bool = False,
    ) -> ToolResult:
        return await self.sandbox.file_read(
            filepath=filepath,
            start_line=start_line,
            end_line=end_line,
            sudo=sudo,
        )

    @tool(
        name="file_str_replace",
        description="替换shell会话中的文本",
        params={
            "filepath": {
                "type": "string",
                "description": "要替换的文件路径",
            },
            "old_str": {
                "type": "string",
                "description": "要替换的字符串",
            },
            "new_str": {
                "type": "string",
                "description": "替换后的字符串",
            },
            "sudo": {
                "type": "boolean",
                "description": "是否使用sudo权限",
            },
        },
        required=["filepath", "old_str", "new_str"],
    )
    async def file_str_replace(
        self,
        filepath: str,
        old_str: str,
        new_str: str,
        sudo: bool = False,
    ) -> ToolResult:
        return await self.sandbox.file_replace(
            filepath=filepath,
            old_str=old_str,
            new_str=new_str,
            sudo=sudo,
        )

    @tool(
        name="file_find_in_content",
        description="在shell会话的文件中查找字符串",
        params={
            "filepath": {
                "type": "string",
                "description": "要查找的文件路径",
            },
            "regex": {
                "type": "string",
                "description": "要查找的正则表达式",
            },
            "sudo": {
                "type": "boolean",
                "description": "是否使用sudo权限",
            },
        },
        required=["filepath", "regex"],
    )
    async def file_find_in_content(
        self,
        filepath: str,
        regex: str,
        sudo: bool = False,
    ) -> ToolResult:
        return await self.sandbox.file_search(
            filepath=filepath,
            regex=regex,
            sudo=sudo,
        )

    @tool(
        name="file_find_in_name",
        description="在shell会话的文件中查找文件名",
        params={
            "dir_path": {
                "type": "string",
                "description": "要查找的目录路径",
            },
            "glob_pattern": {
                "type": "string",
                "description": "要查找的文件名模式",
            },
        },
        required=["dir_path", "glob_pattern"],
    )
    async def file_find_in_name(
        self,
        dir_path: str,
        glob_pattern: str,
    ) -> ToolResult:
        return await self.sandbox.file_find(
            dirpath=dir_path,
            glob_pattern=glob_pattern,
        )

    @tool(
        name="file_list",
        description="列出shell会话的目录",
        params={
            "dir_path": {
                "type": "string",
                "description": "要列出的目录路径",
            },
        },
        required=["dir_path"],
    )
    async def file_list(
        self,
        dir_path: str,
    ) -> ToolResult:
        return await self.sandbox.file_list(
            dirpath=dir_path,
        )
