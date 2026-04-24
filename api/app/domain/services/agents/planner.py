from app.domain.models.event import StepEventStatus
from app.domain.services.prompts.plan import UPDATE_PLAN_PROMPT
from app.domain.models.plan import Step, Plan
from app.domain.models.event import PlanEventStatus
from app.domain.models.event import PlanEvent
from app.domain.models.event import MessageEvent
from app.domain.models.event import Event
from typing import AsyncGenerator
from typing import Optional
from app.domain.services.prompts.plan import SYSTEM_PLAN_PROMPT, CREATE_PLAN_PROMPT
from app.domain.services.prompts.system import SYSTEM_PROMPT
from typing import List
from app.domain.services.tools.base import BaseTool
from app.domain.external.json_parser import JSONParser
from app.domain.models.memory import Memory
from app.domain.external.llm import LLM
from app.domain.models.app_config import Agent_Config
from app.domain.services.agents.base import BaseAgent
from app.domain.models.message import Message


"""
多Agent系统/flow = PlannerAgent + ReActAgent

顺序：
1、PlannerAgent生成规划
2、循环取出规划中的子步骤，让ReActAgent执行
3、ReActAgent执行完一个子步骤后，更新子步骤状态
4、...
5、直至所有的子任务/步骤完成，进行汇总，返回汇总信息
"""


class PalanAgent(BaseAgent):
    """规划智能体"""

    _name = "planner"
    _system_prompt = SYSTEM_PROMPT + SYSTEM_PLAN_PROMPT
    _format: Optional[str] = "json_object"
    _tool_choice: Optional[str] = None

    def __init__(
        self,
        agent_config: Agent_Config,
        llm: LLM,
        memory: Memory,
        json_parser: JSONParser,
        tools: List[BaseTool],
    ) -> None:
        super().__init__(agent_config, llm, memory, json_parser, tools)

    async def createPlan(self, message: Message) -> AsyncGenerator[Event, None]:
        query = CREATE_PLAN_PROMPT.format(
            message=message.message, attachments="\n".join(message.attachments)
        )

        async for event in self.invoke(query):
            if isinstance(event, MessageEvent):
                parsed_obj = await self._json_parser.invoke(event.message)

                plan = Plan.model_validate(parsed_obj)

                yield PlanEvent(plan=plan, status=PlanEventStatus.CREATED)
            else:
                # comment: :
                yield event

    async def updatePlan(self, plan: Plan, step: Step) -> AsyncGenerator[Event, None]:
        query = UPDATE_PLAN_PROMPT.format(
            plan=plan.model_dump_json(), step=step.model_dump_json()
        )

        async for event in self.invoke(query):
            if isinstance(event, MessageEvent):
                parsed_obj = await self._json_parser.invoke(event.message)

                updated_plan = Plan.model_validate(parsed_obj)

                newSteps = [Step.model_validate(step) for step in updated_plan.steps]

                first_pending_index = None
                for i, step in enumerate(plan.steps):
                    if not step.done():
                        first_pending_index = i
                        break

                if first_pending_index is not None:
                    updateSteps = plan.steps[:first_pending_index]
                    updateSteps.extend(newSteps)
                    plan.steps = updateSteps

                yield PlanEvent(plan=plan, status=PlanEventStatus.UPDATED)
            else:
                # comment: :
                yield event
