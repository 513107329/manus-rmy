from typing import Optional
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


class ListA2AServerItem(BaseModel):
    id: str = ""
    name: str = ""
    description: str = ""
    input_modes: List[str] = Field(default_factory=list)
    output_modes: List[str] = Field(default_factory=list)
    streamable: Optional[bool] = False
    push_notifications: Optional[bool] = False
    enabled: bool = True


class ListA2AServerResponse(BaseModel):
    a2a_servers: List[ListA2AServerItem] = Field(default_factory=list)
