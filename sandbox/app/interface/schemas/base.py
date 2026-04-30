from pydantic import Field
from app.domain.models.app_config import McpTransport
from pydantic import BaseModel
from typing import List


class ListMCPServerItem(BaseModel):
    server_name: str = ""
    enabled: bool = True
    transport: McpTransport = McpTransport.STREAMABLE_HTTP
    tools: List[str] = Field(default_factory=list)


class ListMCPServerResponse(BaseModel):
    mcp_servers: List[ListMCPServerItem] = Field(default_factory=list)
