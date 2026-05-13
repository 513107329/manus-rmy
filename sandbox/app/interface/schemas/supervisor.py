
from pydantic import BaseModel, Field

class SupervisorTimeoutRequest(BaseModel):
    minutes: int = Field(default=60, description="超时时间")
