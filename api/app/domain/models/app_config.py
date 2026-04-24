from typing import List
from typing import Optional
from enum import Enum
from pydantic import Field, ConfigDict, HttpUrl, BaseModel, model_validator
from typing import Dict, Any


class App_Config(BaseModel):
    llm_config: LLM_Config
    agent_config: Agent_Config
    mcp_config: Mcp_Config

    model_config = ConfigDict(
        extra="allow",
    )


class LLM_Config(BaseModel):
    base_url: HttpUrl = "https://api.deepseek.com"
    api_key: str = ""
    model_name: str = "deepseek-chat"
    tempature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=8192, ge=1)


class Agent_Config(BaseModel):
    """Agent通用配置"""

    max_iterations: int = Field(default=100, gt=0, lt=1000)
    max_retries: int = Field(default=3, gt=0, lt=10)
    max_search_results: int = Field(default=10, gt=0, lt=100)


class McpTransport(str, Enum):
    STDIO = "stdio"
    STREAMABLE_HTTP = "streamable_http"
    SSE = "sse"


class McpServerConfig(BaseModel):
    transport: McpTransport = McpTransport.STREAMABLE_HTTP  # 传输协议
    enabled: bool = True  # 是否启用
    description: str = ""
    env: Optional[Dict[str, str]] = None  # 环境变量

    # stdio配置
    command: Optional[str] = None  # 命令
    args: Optional[List[str]] = None  # 参数

    # streamable_http和sse配置
    url: Optional[str] = None  # url
    headers: Optional[Dict[str, Any]] = None  # 请求头

    model_config = ConfigDict(extra="allow")

    @model_validator(mode="after")
    def validate_config(self) -> "McpServerConfig":
        if self.transport == McpTransport.STDIO:
            if not self.command:
                raise ValueError("command is required for stdio transport")
        elif self.transport in [McpTransport.STREAMABLE_HTTP, McpTransport.SSE]:
            if not self.url:
                raise ValueError(
                    "url is required for streamable_http and sse transport"
                )
        return self


class Mcp_Config(BaseModel):
    mcpServers: Dict[str, McpServerConfig] = Field(default_factory=dict)

    model_config = ConfigDict(extra="allow", arbitrary_types_allowed=True)
