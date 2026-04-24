from app.domain.models.file import File
from app.domain.services.prompts.react import SUMMARY_PROMPT
from app.domain.models.event import ErrorEvent
from app.domain.models.event import ToolEventStatus
from app.domain.models.event import ToolEvent
from app.domain.models.event import MessageEvent
from app.domain.models.plan import ExecutionStatus
from app.domain.models.event import StepEventStatus, StepEvent
from app.domain.services.prompts.react import EXECUTION_PROMPT
from app.domain.models.event import Event
from app.domain.models.message import Message
from app.domain.models.plan import Plan, Step
from typing import AsyncGenerator
from app.domain.services.prompts.react import SYSTEM_REACT_PROMPT
from app.domain.services.prompts.system import SYSTEM_PROMPT
from typing import Optional
from pydantic import BaseModel


class ReActAgent(BaseModel):
    _name = "reacter"
    _system_prompt = SYSTEM_PROMPT + SYSTEM_REACT_PROMPT
    _format: Optional[str] = "json_object"
    _tool_choice: Optional[str] = None

    async def exucuteStep(
        self, plan: Plan, step: Step, messge: Message
    ) -> AsyncGenerator[Event, None]:
        query = EXECUTION_PROMPT.format(
            attachments="\n".join(messge.attachments),
            step=step.description,
            message=messge.message,
            language=plan.language,
        )

        step.status = ExecutionStatus.RUNNING

        yield StepEvent(step=step, status=StepEventStatus.STARTED)

        async for event in self.invoke(query):
            if isinstance(event, ToolEvent):
                if event.function_name == "message_call":
                    if event.status == ToolEventStatus.CALLING:
                        
            elif isinstance(event, MessageEvent):
                step.status = ExecutionStatus.COMPLETED
                parsed_obj = await self._json_parser.invoke(event.message)

                newStep = Step.model_validate(parsed_obj)

                step.success = newStep.success
                step.result = newStep.result
                step.attachments = newStep.attachments

                yield StepEvent(step=step, status=StepEventStatus.COMPLETED)

                if step.result:
                    yield MessageEvent(role="assistant", message=step.result)
                continue
            elif isinstance(event, ErrorEvent):
                step.status = ExecutionStatus.FAILED
                step.error = event.error
                yield StepEvent(step=step, status=StepEventStatus.FAILED)
            else:
                yield event
        
        step.status = ExecutionStatus.COMPLETED
        yield StepEvent(step=step, status=StepEventStatus.COMPLETED)

    async def summarize(self) -> AsyncGenerator[Event, None]:
        query = SUMMARY_PROMPT

        async for event in self.invoke(query):
            if isinstance(event, MessageEvent):
                parsed_obj = await self._json_parser.invoke(event.message)
                message = Message.model_validate(parsed_obj)
                attachments = [File(filepath=filepath) for filepath in message.attachments]
                yield MessageEvent(role="assistant", message=message.message, attachments=attachments)
            else:
                yield event
