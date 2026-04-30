from pydantic import ConfigDict
import asyncio
from concurrent.futures import process
from typing import List
from typing import Optional
from pydantic import BaseModel, Field


class WaitProcessResult(BaseModel):
    returncode: Optional[str] = Field(default=None, description="shell执行的返回码")


class ShellViewResult(BaseModel):
    session_id: str = Field(..., description="会话ID")
    output: str = Field(..., description="输出")
    console_records: List[ConsoleRecord] = Field(default_factory=list)


class ConsoleRecord(BaseModel):
    ps1: str = Field(..., description="提示符")
    command: str = Field(..., description="执行的命令")
    output: str = Field(..., description="输出")


class Shell(BaseModel):
    process: asyncio.subprocess.Process = Field(..., description="执行的子进程")
    exec_dir: str = Field(..., description="执行目录")
    output: str = Field(..., description="输出")
    console_records: List[ConsoleRecord] = Field(default_factory=list)

    model_config = ConfigDict(arbitrary_types_allowed=True)


class ShellExecResult(BaseModel):
    session_id: str = Field(..., description="会话ID")
    command: str = Field(..., description="执行的命令")
    status: str = Field(..., description="shell执行的状态")
    returncode: Optional[str] = Field(default=None, description="shell执行的返回码")
    stdout: Optional[str] = Field(default=None, description="shell执行的标准输出")
    stderr: Optional[str] = Field(default=None, description="shell执行的标准错误")
