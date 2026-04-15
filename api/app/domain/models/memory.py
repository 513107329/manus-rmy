import logging
from typing import Optional
from typing import Any
from typing import Dict
from typing import List
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class Memory(BaseModel):
    """记忆类，定义Agent的记忆基础消息 class Memory"""

    def __init__(self, messages: List[Dict[str, Any]]):
        self.messages = messages

    @classmethod
    def get_role_info(cls, message: Dict[str, Any]) -> str:
        """根据传递的消息来获取消息的角色信息 def get_role_info(message: str) -> str"""
        return message.get("role")

    def add_message(self, message: Dict[str, Any]) -> None:
        """往记忆中添加一条消息 def add_message(message: str) -> None"""
        self.messages.append(message)

    def add_messages(self, messages: list[Dict[str, Any]]) -> None:
        """往记忆中添加多条消息 def add_messages(messages: list[str]) -> None"""
        self.messages.extend(messages)

    def get_messages(self) -> List[str]:
        """获取记忆中的所有消息列表 get_messages"""
        return self.messages

    def get_last_message(self) -> Optional[str]:
        """获取最后一条记忆信息，如果不存在则返回None"""
        return self.messages[-1] if len(self.messages) > 0 else None

    def rollback_memory(self) -> None:
        """回滚记忆，删除最后一条消息"""
        self.messages = self.messages[:-1]

    def compress_memory(self) -> None:
        """记忆压缩，将记忆中已经执行的工具、搜索、网页源码获取这类已经执行过的消息压缩简化"""
        for message in self.messages:
            if self.get_role_info(message) == "tool":
                if message.get("tool_name") in []:
                    message["content"] = "(Removed)"
                    logger.debug(
                        f"从记忆中移除对应工具的结果: {message.get('tool_name')}"
                    )

    @property
    def is_empty(self) -> bool:
        """只读属性，检查记忆是否为空"""
        return len(self.messages) == 0
