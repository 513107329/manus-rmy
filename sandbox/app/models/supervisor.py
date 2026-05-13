from typing import Any
from typing import Optional
from pydantic import BaseModel, Field

class ProcessInfo(BaseModel):
    name: str = Field(..., description="进程名")
    group: str = Field(..., description="进程组")
    description: str = Field(..., description="进程描述")
    start: int = Field(..., description="启动时间")
    stop: int = Field(..., description="结束时间")
    now: int = Field(..., description="当前时间")
    state: int = Field(..., description="进程状态代码")
    statename: str = Field(..., description="进程状态名")
    spawnerr: str = Field(..., description="启动错误")
    exitstatus: int = Field(..., description="退出状态码")
    logfile: str = Field(..., description="日志文件")
    stdout_logfile: str = Field(..., description="标准输出日志文件")
    stderr_logfile: str = Field(..., description="标准错误日志文件")
    pid: int = Field(..., description="进程ID")

class SupervisorActionResult(BaseModel):
    status: str = Field(..., description="操作状态")
    result: Optional[Any] = Field(None, description="操作结果")
    stop_result: Optional[Any] = Field(None, description="停止结果")
    start_result: Optional[Any] = Field(None, description="启动结果")
    shutdown_result: Optional[Any] = Field(None, description="关闭结果")

class SupervisorTimeout(BaseModel):
    status: Optional[str] = Field(None, description="超时设置状态")
    active: bool = Field(default=False, description="超时设置是否激活")
    shutdown_time: Optional[str] = Field(default=None, description="超时时间")
    remaining_seconds: Optional[float] = Field(None, description="超时剩余秒数")
    timeout_minutes: Optional[float] = Field(None, description="超时销毁分钟数")
