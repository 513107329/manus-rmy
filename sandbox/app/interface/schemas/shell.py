from pydantic import Field
from pydantic import BaseModel


class ExecCommandRequest(BaseModel):
    session_id: str = Field(default=None, description="目标Shell会话的唯一标识")
    command: str = Field(..., description="要执行的Shell命令")
    exec_dir: str = Field(default=None, description="执行命令的工作目录")


class ViewShellRequest(BaseModel):
    session_id: str = Field(default=None, description="目标Shell会话的唯一标识")
    console: bool = Field(default=None, description="是否返回控制台列表")


class WaitForProcessRequest(BaseModel):
    session_id: str = Field(default=None, description="目标Shell会话的唯一标识")
    seconds: int = Field(default=None, description="等待的秒数")


class WriteToProcessRequest(BaseModel):
    session_id: str = Field(default=None, description="目标Shell会话的唯一标识")
    inputText: str = Field(default=None, description="需要写入的内容文本")
    enter: bool = Field(default=True, description="是否按下回车键")


class KillProcessRequest(BaseModel):
    session_id: str = Field(default=None, description="目标Shell会话的唯一标识")
