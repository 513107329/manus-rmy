from typing import Optional
from app.domain.models.tool_result import ToolResult
from app.domain.external.sandbox import Sandbox
from app.domain.services.tools.base import BaseTool, tool


class ShellTool(BaseTool):
    def __init__(self, sandbox: Sandbox):
        self.sandbox = sandbox

    @tool(
        name="shell_exec",
        description="执行shell命令",
        params={
            "session_id": {
                "type": "string",
                "description": "目标shell会话的唯一标识",
            },
            "exec_dir": {
                "type": "string",
                "description": "执行目录",
            },
            "command": {
                "type": "string",
                "description": "要执行的shell命令",
            },
        },
        required=["session_id", "exec_dir", "command"],
    )
    async def shell_exec(
        self, session_id: str, exec_dir: str, command: str
    ) -> ToolResult:
        return await self.sandbox.exec_command(
            session_id=session_id, exec_dir=exec_dir, command=command
        )

    @tool(
        name="shell_view",
        description="查看指定shell会话的内容",
        params={
            "session_id": {
                "type": "string",
                "description": "目标shell会话的唯一标识",
            }
        },
        required=["session_id"],
    )
    async def shell_view(self, session_id: str) -> ToolResult:
        return await self.sandbox.view_shell(session_id=session_id)

    @tool(
        name="shell_wait",
        description="等待指定shell会话中正在运行的进程返回",
        params={
            "session_id": {
                "type": "string",
                "description": "目标shell会话的唯一标识",
            },
            "seconds": {
                "type": "integer",
                "description": "等待的秒数",
            },
        },
        required=["session_id"],
    )
    async def shell_wait(
        self, session_id: str, seconds: Optional[int] = None
    ) -> ToolResult:
        return await self.sandbox.wait_for_process(
            session_id=session_id, seconds=seconds
        )

    @tool(
        name="shell_write_to_process",
        description="向指定shell会话中正在运行的进程写入内容",
        params={
            "session_id": {
                "type": "string",
                "description": "目标shell会话的唯一标识",
            },
            "input_text": {
                "type": "string",
                "description": "要写入的内容",
            },
            "press_enter": {
                "type": "boolean",
                "description": "是否按回车键",
            },
        },
        required=["session_id", "input_text", "press_enter"],
    )
    async def shell_write_to_process(
        self, session_id: str, input_text: str, press_enter: bool
    ) -> ToolResult:
        return await self.sandbox.write_to_process(
            session_id=session_id, input_text=input_text, press_enter=press_enter
        )

    @tool(
        name="shell_kill_process",
        description="杀死指定shell会话中正在运行的进程",
        params={
            "session_id": {
                "type": "string",
                "description": "目标shell会话的唯一标识",
            }
        },
        required=["session_id"],
    )
    async def shell_kill_process(self, session_id: str) -> ToolResult:
        return await self.sandbox.kill_process(session_id=session_id)
