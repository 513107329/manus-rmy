from typing import Optional
from app.domain.services.tools.base import BaseTool
from sqlalchemy import false
from app.domain.models.tool_result import ToolResult
from mcp.client.streamable_http import streamable_http_client
from mcp.client.sse import sse_client
from mcp import stdio_client
from mcp import StdioServerParameters
from app.domain.models.app_config import McpServerConfig
from app.domain.models.app_config import McpTransport
import httpx
import logging
from typing import List
from mcp import Tool
from typing import Any
import os
from contextlib import AsyncExitStack
from mcp import ClientSession
from typing import Dict
from app.domain.models.app_config import Mcp_Config

logger = logging.getLogger(__name__)


class McpClientManager:
    def __init__(self, mcp_config: Mcp_Config = None):
        self._mcp_config = mcp_config
        self._async_exist_stack: AsyncExitStack = AsyncExitStack()
        self._clients: Dict[str, ClientSession] = {}
        self._tools: Dict[str, List[Tool]] = {}
        self._initialized: bool = False

    async def initialize(self):
        if self._initialized:
            return
        try:
            await self._connect_mcp_servers()
        except Exception as e:
            logger.error(f"Failed to initialize MCP client: {e}")
            raise

    async def _connect_mcp_servers(self):
        if self._mcp_config is None:
            return
        for serverName, serverConfig in self._mcp_config.mcpServers.items():
            try:
                transport = serverConfig.transport

                if transport == McpTransport.STDIO:
                    await self._connect_stdio_server(serverName, serverConfig)
                elif transport == McpTransport.STREAMABLE_HTTP:
                    await self._connect_streamable_http_server(serverName, serverConfig)
                elif transport == McpTransport.SSE:
                    await self._connect_sse_server(serverName, serverConfig)
                else:
                    raise ValueError(f"Unsupported MCP transport: {transport}")
            except Exception as e:
                logger.error(
                    f"Failed to connect to MCP server: {serverName}, error: {e}"
                )
                continue

    async def _connect_stdio_server(
        self, serverName: str, serverConfig: McpServerConfig
    ):
        command = serverConfig.command
        args = serverConfig.args
        env = serverConfig.env

        if not command:
            raise ValueError(f"MCP server {serverName} has no command")
        server_parameters = StdioServerParameters(
            command=command,
            args=args,
            env={**os.environ, **env},
        )

        try:
            stdio_transport = await self._async_exist_stack.enter_async_context(
                stdio_client(server_parameters)
            )
            read_stream, write_stream = stdio_transport
            session = await self._async_exist_stack.enter_async_context(
                ClientSession(read_stream, write_stream)
            )
            await session.initialize()
            self._clients[serverName] = session
            await self._cache_mcp_server_tools(serverName, session)
        except Exception as e:
            logger.error(f"Failed to connect to MCP server: {serverName}, error: {e}")
            raise

    async def _cache_mcp_server_tools(self, serverName: str, session: ClientSession):
        try:
            toolsResponse = await session.list_tools()
            print(serverName, toolsResponse.tools, "toolsResponse")
            self._tools[serverName] = toolsResponse.tools
        except Exception as e:
            logger.error(f"Failed to cache MCP server tools: {serverName}, error: {e}")
            self._tools[serverName] = []
            raise

    async def _connect_streamable_http_server(
        self, serverName: str, serverConfig: McpServerConfig
    ):
        url = serverConfig.url
        if not url:
            raise ValueError(f"MCP server {serverName} has no url")
        try:
            http_client = await self._async_exist_stack.enter_async_context(
                httpx.AsyncClient(headers=serverConfig.headers)
            )
            streamable_http_transport = (
                await self._async_exist_stack.enter_async_context(
                    streamable_http_client(url=url, http_client=http_client)
                )
            )
            if len(streamable_http_transport) == 3:
                read_stream, write_stream, _ = streamable_http_transport
            else:
                read_stream, write_stream = streamable_http_transport

            session = await self._async_exist_stack.enter_async_context(
                ClientSession(read_stream, write_stream)
            )
            await session.initialize()
            self._clients[serverName] = session
            await self._cache_mcp_server_tools(serverName, session)
        except Exception as e:
            logger.error(f"Failed to connect to MCP server: {serverName}, error: {e}")
            raise

    async def _connect_sse_server(self, serverName: str, serverConfig: McpServerConfig):
        url = serverConfig.url
        if not url:
            raise ValueError(f"MCP server {serverName} has no url")
        try:
            sse_transport = await self._async_exist_stack.enter_async_context(
                sse_client(url=url, headers=serverConfig.headers)
            )
            read_stream, write_stream = sse_transport
            session = await self._async_exist_stack.enter_async_context(
                ClientSession(read_stream, write_stream)
            )
            await session.initialize()
            self._clients[serverName] = session
            await self._cache_mcp_server_tools(serverName, session)
        except Exception as e:
            logger.error(f"Failed to connect to MCP server: {serverName}, error: {e}")
            raise

    async def get_all_tools(self) -> List[Tool]:
        all_tools = []
        for serverName, tools in self._tools.items():
            for tool in tools:
                if serverName.startswith("mcp"):
                    tool_name = serverName + tool.name
                else:
                    tool_name = "mcp_" + serverName + tool.name

                tool_schema = {
                    "type": "function",
                    "function": {
                        "name": tool_name,
                        "description": f" [{serverName}] {tool.description or tool.name}",
                        "parameters": tool.inputSchema,
                    },
                }
                all_tools.append(tool_schema)
        return all_tools

    async def invoke(
        self, serverName: str, toolName: str, args: Dict[str, Any]
    ) -> ToolResult:
        try:
            session = self._clients[serverName]
            result = await session.call_tool(toolName, args)
            if result:
                content = []
                if hasattr(result, "content") and result.content:
                    for item in result.content:
                        if hasattr(item, "text"):
                            content.append(item.text)
                        else:
                            content.append(str(item))
                return ToolResult(
                    success=True,
                    message="工具执行成功",
                    data="\n".join(content) if content else "工具执行成功",
                )
            else:
                return ToolResult(success=False, message="工具执行成功")
        except Exception as e:
            logger.error(f"Failed to invoke tool: {toolName}, error: {e}")
            return ToolResult(
                success=False,
                message=str(e),
            )

    async def cleanup(self):
        try:
            await self._async_exist_stack.aclose()
            self._clients.clear()
            self._tools.clear()
            self._initialized = False
        except Exception as e:
            logger.error(f"Failed to cleanup MCP client: {e}")

    @property
    def tools(self):
        return self._tools


class McpTool(BaseTool):
    name: str = "mcp"

    def __init__(self) -> None:
        super.__init__()
        self._initailized = False
        self._tools = []
        self._manager: McpClientManager = None

    async def initialize(self, mcp_config: Optional[Mcp_Config] = None) -> None:
        """初始化MCP工具包"""
        if not self._initailized:
            self._initailized = True
            self._manager = McpClientManager(mcp_config=mcp_config)
            await self._manager.initialize()

            self._tools = await self._manager.get_all_tools()

    def get_tools(self) -> List[Dict[str, Any]]:
        return self._tools

    def has_tool(self, tool_name: str) -> bool:
        for tool in self._tools:
            if tool["function"]["name"] == tool_name:
                return True
        return False

    async def invoke(self, tool_name: str, **kwargs) -> ToolResult:
        return await self._manager.invoke(tool_name, kwargs)

    async def cleanup(self) -> None:
        if self._manager:
            await self._manager.cleanup()
