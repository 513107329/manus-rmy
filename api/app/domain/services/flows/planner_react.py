from app.domain.models.plan import ExecutionStatus
from app.domain.models.event import MessageEvent
from app.domain.models.event import TitleEvent
from app.domain.models.event import PlanEventStatus
from app.domain.models.event import PlanEvent
from app.domain.models.event import DoneEvent
from httpcore import __name
import logging
from app.domain.models.session import SessionStatus
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

logger = logging.getLogger(__name__)


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

    async def invoke(self, message: Message) -> AsyncGenerator[BaseEvent, None]:
        session = self.session_repository.get_by_id(self.session_id)
        if session is None:
            raise ValueError("Session not found")

        # 会话状态是否空闲
        if session.status != SessionStatus.PENDING:
            logger.debug("会话未处于空闲状态，回滚数据确保消息列表格式正确")
            await self.planner.roll_back(message)
            await self.react.roll_back(message)

        # 会话状态为运行中，则流需要重新规划内容/plan
        if session.status == SessionStatus.RUNNING:
            logger.debug("会话处于运行中状态，重新规划内容/plan")
            self.status = FlowStatus.PLANNING

        # 会话状态为等待中，则流需要修改状态为执行中
        if session.status == SessionStatus.WAITING:
            logger.debug("会话处于等待中状态，修改状态为执行中")
            self.status = FlowStatus.EXECUTING

        await self.session_repository.update_status(
            self.session_id, SessionStatus.RUNNING
        )

        self.plan = session.get_latest_plan()

        step = None

        while True:
            if self.status == FlowStatus.IDLE:
                self.status = FlowStatus.PLANNING
            elif self.status == FlowStatus.PLANNING:
                # 流状态为规划中，调用规划Agent
                async for event in self.planner.createPlan(message):
                    if (
                        isinstance(event, PlanEvent)
                        and event.status == PlanEventStatus.CREATED
                    ):
                        self.plan = event.plan
                        yield TitleEvent(title=event.plan.title)
                        yield MessageEvent(role="assistant", message=event.plan.message)

                    yield event

                self.status = FlowStatus.EXECUTING

                if not self.plan or len(self.plan.steps) == 0:
                    self.status = FlowStatus.COMPLETED

            elif self.status == FlowStatus.EXECUTING:
                self.plan.status = ExecutionStatus.RUNNING
                step = self.plan.get_next_step()
                if step:
                    async for event in self.react.exucuteStep(self.plan, step, message):
                        yield event
                else:
                    self.status = FlowStatus.SUMMARIZING

                # 压缩执行Agent记忆
                await self.react.compact_memory()

                self.status = FlowStatus.UPDATING
            elif self.status == FlowStatus.UPDATING:
                async for event in self.planner.updatePlan(self.plan, step):
                    yield event
                self.status = FlowStatus.SUMMARIZING
            elif self.status == FlowStatus.SUMMARIZING:
                async for event in self.react.summarize():
                    yield event
                self.status = FlowStatus.COMPLETED
            elif self.status == FlowStatus.COMPLETED:
                self.plan.status = ExecutionStatus.COMPLETED
                self.status = FlowStatus.IDLE
                yield PlanEvent(status=ExecutionStatus.COMPLETED, plan=self.plan)
                break

        yield DoneEvent(status=FlowStatus.IDLE)
        logger.info("流任务处理完毕")

    @property
    def done(self) -> bool:
        return self.status == FlowStatus.IDLE
