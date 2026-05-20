from typing import Union
from typing import List
from typing import Optional
from app.domain.models.tool_result import ToolResult
from app.domain.services.tools.base import BaseTool, tool


class MessageTool(BaseTool):
    def __init__(self) -> None:
        super().__init__()

    @tool(
        name="message_notify_user",
        description="通知用户有新消息且无需用户回复",
        params={
            "text": {"type": "string", "description": "消息内容"},
        },
        required=["text"],
    )
    async def message_notify_user(self, text: str) -> ToolResult:
        return ToolResult(success=True, data="Continue")

    @tool(
        name="message_ask_user",
        description="需要用户回复的消息",
        params={
            "text": {"type": "string", "description": "要展示给用户的问题文本"},
            "attachments": {
                "anyOf": [
                    {"type": "string"},
                    {"type": "array", "items": {"type": "string"}},
                ],
                "description": "附件列表",
            },
            "suggest_user_takeover": {
                "type": "string",
                "enum": ["none", "answer"],
                "description": "建议用户接管的操作",
            },
        },
        required=["text"],
    )
    async def message_ask_user(
        self,
        text: str,
        attachments: Optional[Union[str, List[str]]] = None,
        suggest_user_takeover: Optional[str] = None,
    ) -> ToolResult:
        return ToolResult(success=True)
