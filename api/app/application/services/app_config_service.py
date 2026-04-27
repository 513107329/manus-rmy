from app.domain.services.tools.mcp import McpClientManager
from app.interface.schemas.base import ListMCPServerItem
from typing import List
from app.domain.models.app_config import Mcp_Config
from app.domain.models.app_config import Agent_Config
from app.domain.models.app_config import LLM_Config
from app.domain.repositories.app_config_repository import AppConfigRepository


class AppConfigService:
    def __init__(self, app_config_repository: AppConfigRepository):
        self.app_config_repository = app_config_repository

    def get_app_config(self):
        return self.app_config_repository.load()

    def get_llm_config(self):
        return self.get_app_config().llm_config

    def get_agent_config(self):
        return self.get_app_config().agent_config

    async def get_mcp_servers(self) -> List[ListMCPServerItem]:
        mcp_config = self.get_app_config().mcp_config
        mcp_servers = []
        mcp_client_manager = McpClientManager(mcp_config)

        try:
            await mcp_client_manager.initialize()
            tools = mcp_client_manager.tools
            for server_name, server_config in mcp_config.mcpServers.items():
                mcp_servers.append(
                    ListMCPServerItem(
                        server_name=server_name,
                        enabled=server_config.enabled,
                        transport=server_config.transport,
                        tools=[tool.name for tool in tools.get(server_name, [])],
                    )
                )
        finally:
            await mcp_client_manager.cleanup()
        return {mcp_servers}

    def update_llm_config(self, llm_config: LLM_Config):
        app_config = self.get_app_config()
        app_config.llm_config = llm_config
        self.app_config_repository.save(app_config)
        return llm_config

    def update_agent_config(self, agent_config: Agent_Config):
        app_config = self.get_app_config()
        app_config.agent_config = agent_config
        self.app_config_repository.save(app_config)
        return agent_config

    def update_and_create_mcp_server(self, mcp_config: Mcp_Config):
        app_config = self.get_app_config()
        app_config.mcp_config.mcpServers.update(mcp_config.mcpServers)
        self.app_config_repository.save(app_config)
        return app_config.mcp_config

    def delete_mcp_server(self, server_name: str):
        app_config = self.get_app_config()

        if server_name not in app_config.mcp_config.mcpServers:
            raise ValueError(f"MCP服务 {server_name} 不存在")

        del app_config.mcp_config.mcpServers[server_name]
        self.app_config_repository.save(app_config)
        return app_config.mcp_config

    def enable_mcp_server(self, server_name: str, enable: bool):
        app_config = self.get_app_config()

        if server_name not in app_config.mcp_config.mcpServers:
            raise ValueError(f"MCP服务 {server_name} 不存在")

        app_config.mcp_config.mcpServers[server_name].enabled = enable
        self.app_config_repository.save(app_config)
        return app_config.mcp_config
