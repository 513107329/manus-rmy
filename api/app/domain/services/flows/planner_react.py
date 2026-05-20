from app.domain.services.agents.react import ReActAgent
from app.domain.external.json_parser import JSONParser
from app.domain.models.app_config import Agent_Config
from app.domain.external.llm import LLM
from app.domain.services.agents.planner import PlannerAgent
from app.domain.services.tools.mcp import McpTool
from app.domain.services.tools.a2a import A2ATool
from app.domain.services.tools.search import SearchTool
from app.domain.external.search import SearchEngine
from app.domain.external.browser import Browser
from app.domain.services.tools.browser import BrowserTool
from app.domain.services.tools.shell import ShellTool
from app.domain.external.sandbox import Sandbox
from app.domain.services.tools.file import FileTool
from app.domain.models.plan import Plan
from typing import Optional
from app.domain.services.flows.base import FlowStatus
from app.domain.services.flows.base import BaseFlow
from app.domain.models.event import BaseEvent
from typing import AsyncGenerator
from app.domain.models.message import Message
from app.domain.repositories.session_repository import SessionRepository
from app.domain.services.tools.message import MessageTool


class PlannerReactFlow(BaseFlow):
    def __init__(
        self,
        llm: LLM,
        agent_config: Agent_Config,
        json_parser: JSONParser,
        session_id: str,
        session_repository: SessionRepository,
        sandbox: Sandbox,
        browser: Browser,
        search_engine: SearchEngine,
        mcpTool: McpTool,
        a2sTool: A2ATool,
    ):
        self.session_id = session_id
        self.session_repository = session_repository
        self.status = FlowStatus.IDLE
        self.plan: Optional[Plan] = None

        tools = [
            FileTool(sandbox=sandbox),
            ShellTool(sandbox=sandbox),
            BrowserTool(browser=browser),
            SearchTool(search_engine=search_engine),
            MessageTool(),
            mcpTool,
            a2sTool,
        ]

        self.planner = PlannerAgent(
            session_id=session_id,
            session_repository=session_repository,
            tools=tools,
            llm=llm,
            agent_config=agent_config,
            json_parser=json_parser,
        )

        self.react = ReActAgent(
            session_id=session_id,
            session_repository=session_repository,
            tools=tools,
            llm=llm,
            agent_config=agent_config,
            json_parser=json_parser,
        )

    def invoke(self, message: Message) -> AsyncGenerator[BaseEvent, None]:
        pass

    @property
    def done(self) -> bool:
        return self.status == FlowStatus.IDLE
