from pydantic import Field
from pydantic import BaseModel


class HealthStatus(BaseModel):
    status: str = Field(default="", description="健康状态")
    service: str = Field(default="", description="服务名称")
    detail: str = Field(default="", description="服务详情")
