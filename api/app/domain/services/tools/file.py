from app.domain.models.tool_result import ToolResult
from app.domain.external.sandbox import Sandbox
from app.domain.services.tools.base import BaseTool, tool


class FileTool(BaseTool):
    def __init__(self, sandbox: Sandbox):
        self.sandbox = sandbox

    @tool(
        name="file_write",
        description="向指定shell会话中写入文件",
        params={
            "session_id": {
                "type": "string",
                "description": "目标shell会话的唯一标识",
            },
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
        required=[
            "session_id",
            "filepath",
            "content",
            "append",
            "leading_newline",
            "trailing_newline",
            "sudo",
        ],
    )
    async def file_write(
        self,
        session_id: str,
        filepath: str,
        content: str,
        append: bool,
        leading_newline: bool,
        trailing_newline: bool,
        sudo: bool,
    ) -> ToolResult:
        return await self.sandbox.file_write(
            session_id=session_id,
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
            "session_id": {
                "type": "string",
                "description": "目标shell会话的唯一标识",
            },
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
        required=["session_id", "filepath", "start_line", "end_line", "sudo"],
    )
    async def file_read(
        self,
        session_id: str,
        filepath: str,
        start_line: int,
        end_line: int,
        sudo: bool,
    ) -> ToolResult:
        return await self.sandbox.file_read(
            session_id=session_id,
            filepath=filepath,
            start_line=start_line,
            end_line=end_line,
            sudo=sudo,
        )
