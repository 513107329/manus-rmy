from app.domain.services.tools.base import BaseTool
import uuid
import logging
from typing import Any
from typing import Dict
from contextlib import AsyncExitStack
from typing import Optional
from app.domain.models.app_config import A2A_Config
from app.domain.models.tool_result import ToolResult
import httpx
from app.domain.services.tools.base import tool

logger = logging.getLogger(__name__)


class A2AClientManager:
    def __init__(self, a2a_config: Optional[A2A_Config]):
        self.a2a_config = a2a_config
        self._exit_stack = AsyncExitStack()  # 上下文管理器
        self._httpx_client: Optional[httpx.AsyncClient] = None
        self._agent_cards: Dict[str, Any] = {}
        self.initialized: bool = False

    @property
    def agent_cards(self) -> Dict[str, Any]:
        return self._agent_cards

    async def initialize(self):
        if self.initialized:
            return
        try:
            self._httpx_client = await self._exit_stack.enter_async_context(
                httpx.AsyncClient(timeout=600)
            )
            await self._get_remote_agent_cards()
            self.initialized = True
            logger.info("A2A client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize A2A client: {e}")
            raise

    async def _connect_a2a_servers(self):
        if not self.a2a_config or not self.a2a_config.a2a_servers:
            return

    async def call_remote_agent(
        self, session_id: str, tool_name: str, args: dict
    ) -> ToolResult: ...

    async def _get_remote_agent_cards(self) -> None:
        for a2a_serverconfig in self.a2a_config.a2a_servers:
            try:
                agent_card_response = await self._httpx_client.get(
                    f"{a2a_serverconfig.base_url}/.well-known/agent-card.json"
                )
                agent_card_response.raise_for_status()
                self._agent_cards[a2a_serverconfig.id] = agent_card_response.json()
                self._agent_cards[a2a_serverconfig.id][
                    "enabled"
                ] = a2a_serverconfig.enabled
            except Exception as e:
                logger.error(f"Failed to get remote agent cards: {e}")
                raise

    async def invoke(self, agent_id: str, query: str) -> ToolResult:
        # 判断传递的agent_id是否存在
        if agent_id not in self._agent_cards:
            raise ToolResult(success=False, message=f"Agent {agent_id} not found")

        agent_card = self._agent_cards.get(agent_id)
        url = agent_card.get("url", "")

        if url == "":
            return ToolResult(success=False, message=f"Agent {agent_id} url is empty")

        try:
            agent_response = await self._httpx_client.post(
                url,
                json={
                    "id": str(uuid.uuid4()),
                    "jsonrpc": "2.0",
                    "method": "message/send",
                    "params": {
                        "message": {
                            "messageId": str(uuid.uuid4()),
                            "role": "user",
                            "parts": [
                                {
                                    "kind": "text",
                                    "text": query,
                                }
                            ],
                        }
                    },
                },
            )
            agent_response.raise_for_status()
            return ToolResult(
                success=True, message="调用agent成功", data=agent_response.json()
            )
        except Exception as e:
            logger.error(f"调用远程agent失败: {e}")
            raise ToolResult(success=False, message=f"调用远程agent失败: {e}")

    async def cleanup(self) -> None:
        try:
            await self._exit_stack.aclose()
            self._agent_cards.clear()
            self.initialized = False
            logger.info(f"清除A2A客户端成功")
        except Exception as e:
            logger.error(f"清除A2A客户端失败: {e}")
            raise


class A2ATool(BaseTool):
    name: str = "a2a"

    def __init__(self):
        super().init()
        self.manager: Optional[A2AClientManager] = None
        self.initialized: bool = False

    async def initialize(self, a2a_config: Optional[A2A_Config] = None) -> None:
        if not self.initialized:
            try:
                self.manager = A2AClientManager(a2a_config)
                await self.manager.initialize()
                self.initialized = True
                logger.info("A2A tool initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize A2A tool: {e}")
                raise

    @tool(
        name="get_remote_agent_cards",
        description="获取远程agent卡片",
        params={},
        required=[],
    )
    async def get_remote_agent_cards(self) -> ToolResult:
        list = []
        for id, agent_card in self.manager.agent_cards.items():
            list.append({"id": id, **agent_card})
        return ToolResult(success=True, message="获取远程agent卡片成功", data=list)

    @tool(
        name="call_remote_agent",
        description="调用远程agent",
        params={
            "agent_id": {
                "type": "string",
                "description": "要调用的agent的id",
            },
            "query": {
                "type": "string",
                "description": "要调用的agent的查询",
            },
        },
        required=["agent_id", "query"],
    )
    async def call_remote_agent(self, agent_id: str, query: str) -> ToolResult:
        return await self.manager.invoke(agent_id, query)
