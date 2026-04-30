from pydantic import Field
from pydantic import BaseModel


class ExecCommandRequest(BaseModel):
    session_id: str = Field(default=None, description="目标Shell会话的唯一标识")
    command: str = Field(..., description="要执行的Shell命令")
    exec_dir: str = Field(default=None, description="执行命令的工作目录")
