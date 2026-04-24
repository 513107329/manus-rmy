from pydantic import BaseModel
from typing import Optional
from typing import Any
from typing import List


class Message(BaseModel):
    """用户传递的消息"""

    message: str = ""
    attachments: Optional[List[str]] = None
