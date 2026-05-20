from app.interface.schemas.base import ListA2AServerResponse
from app.interface.schemas.base import ListA2AServerItem
from app.domain.models import app_config
from app.domain.models.app_config import App_Config
from app.domain.models.app_config import A2A_ServerConfig
from app.domain.services.tools.mcp import McpClientManager
from app.interface.schemas.base import ListMCPServerItem
from typing import List
from app.domain.models.app_config import Mcp_Config
from app.domain.models.app_config import Agent_Config
from app.domain.models.app_config import LLM_Config
from app.domain.repositories.app_config_repository import AppConfigRepository
from app.domain.services.tools.a2a import A2AClientManager


class AppConfigService:
    def __init__(self, app_config_repository: AppConfigRepository):
        self.app_config_repository = app_config_repository

    def get_app_config(self) -> App_Config:
        return self.app_config_repository.load()

    def get_llm_config(self) -> LLM_Config:
        return self.get_app_config().llm_config

    def get_agent_config(self) -> Agent_Config:
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

    async def get_a2a_servers(self) -> ListA2AServerResponse:
        a2a_config = self.get_app_config().a2a_config
        a2a_servers = []
        a2a_client_manager = A2AClientManager(a2a_config)
        try:
            await a2a_client_manager.initialize()
            for id, agent_card in a2a_client_manager.agent_cards.items():
                a2a_servers.append(
                    ListA2AServerItem(
                        id=id,
                        name=agent_card.get("name"),
                        description=agent_card.get("description"),
                        input_modes=agent_card.get("defaultInputModes"),
                        output_modes=agent_card.get("defaultOutputModes"),
                        streamable=agent_card.get("capabilities", {}).get(
                            "streaming", False
                        ),
                        push_notifications=agent_card.get("capabilities", {}).get(
                            "push_notifications", False
                        ),
                        enabled=agent_card.get("enabled", False),
                    )
                )
        finally:
            await a2a_client_manager.cleanup()
        return {"a2a_servers": a2a_servers}

    def create_a2a_server(self, base_url: str):
        app_config = self.get_app_config()
        app_config.a2a_config.a2a_servers.append(A2A_ServerConfig(base_url=base_url))
        self.app_config_repository.save(app_config)
        return app_config.a2a_config

    def delete_a2a_server(self, id: str):
        app_config = self.get_app_config()
        a2a_servers = app_config.a2a_config.a2a_servers

        # 查找并删除
        for i, server in enumerate(a2a_servers):
            if server.id == id:
                a2a_servers.pop(i)
                self.app_config_repository.save(app_config)
                return app_config.a2a_config

        raise ValueError(f"A2A服务 {id} 不存在")

    def enable_a2a_server(self, id: str, enable: bool):
        app_config = self.get_app_config()
        a2a_servers = app_config.a2a_config.a2a_servers

        # 查找目标服务器
        server = next((s for s in a2a_servers if s.id == id), None)

        if not server:
            raise ValueError(f"A2A服务 {id} 不存在")

        server.enabled = enable
        self.app_config_repository.save(app_config)
        return app_config.a2a_config
