import asyncio
from app.infrastructure.storage.database import get_uow
from app.domain.repositories.uow import IUnitOfWork
from typing import Callable
from app.domain.models.event import WaitEvent
from app.domain.models.event import DoneEvent
from pydantic import TypeAdapter
from app.domain.models.event import MessageEvent
from app.domain.external.file_storage import FileStorage
from app.domain.external.search import SearchEngine
from app.domain.external.json_parser import JSONParser
from app.domain.models.app_config import Mcp_Config
from app.domain.models.app_config import Agent_Config
from app.domain.external.llm import LLM
from app.domain.models.app_config import A2A_Config
from app.domain.services.agent_task_runner import AgentTaskRunner
from app.domain.external.sandbox import Sandbox
from app.domain.models.session import SessionStatus
from app.domain.external.task import Task
from app.application.errors.exceptions import AppException
from app.domain.models.event import ErrorEvent
import logging
from app.domain.models.event import BaseEvent
from typing import AsyncGenerator, Optional
from datetime import datetime
from app.domain.models.session import Session
from app.domain.models.file import File
from app.domain.models.event import Event

logger = logging.getLogger(__name__)


class AgentService:
    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        task_cls: type[Task],
        sandbox_cls: type[Sandbox],
        llm: LLM,
        agent_config: Agent_Config,
        mcp_config: Mcp_Config,
        a2a_config: A2A_Config,
        json_parser: JSONParser,
        search_engine: SearchEngine,
        file_storage: FileStorage,
    ):
        self.uow_factory = uow_factory
        self.uow: IUnitOfWork = uow_factory()
        self.task_cls = task_cls
        self.sandbox_cls = sandbox_cls
        self.llm = llm
        self.agent_config = agent_config
        self.mcp_config = mcp_config
        self.a2a_config = a2a_config
        self.json_parser = json_parser
        self.search_engine = search_engine
        self.file_storage = file_storage
        logger.info(f"AgentService初始化完成")

    def _get_task(self, session: Session) -> Task:
        task_id = session.task_id
        if task_id is None:
            return

        task = self.task_cls.get(task_id)
        return task

    async def _create_task(self, session: Session) -> Task:
        sandbox = None
        sandbox_id = session.sandbox_id
        if sandbox_id:
            sandbox = await self.sandbox_cls.get(sandbox_id)

        if not sandbox:
            sandbox = await self.sandbox_cls.create()
            session.sandbox_id = sandbox.id
            async with self.uow:
                await self.uow.session.save(session)

        browser = await sandbox.get_browser()
        if browser is None:
            raise AppException(msg=f"会话{session.id}的浏览器不存在")

        taskRunner = AgentTaskRunner(
            llm=self.llm,
            agent_config=self.agent_config,
            mcp_config=self.mcp_config,
            a2a_config=self.a2a_config,
            json_parser=self.json_parser,
            sandbox=sandbox,
            browser=browser,
            session_id=session.id,
            search_engine=self.search_engine,
            file_storage=self.file_storage,
            uow_factory=get_uow,
        )
        logger.info(f"AgentTaskRunner created")

        task = self.task_cls.create(taskRunner)
        logger.info(f"Task created", task.id)
        session.task_id = task.id
        async with self.uow:
            await self.uow.session.save(session)
        return task

    async def chat(
        self,
        session_id: str,
        message: Optional[str],
        attachments: Optional[list[str]],
        latest_event_id: Optional[str],
        timestamp: Optional[datetime],
    ) -> AsyncGenerator[BaseEvent, None]:
        try:
            async with self.uow:
                session = await self.uow.session.get_by_id(session_id)
                if session is None:
                    logger.error(f"会话{session_id}不存在")
                    raise RuntimeError(f"会话{session_id}不存在")

            task = self._get_task(session)

            if message:
                if session.status != SessionStatus.RUNNING or task is None:
                    task = await self._create_task(session)
                    if not task:
                        logger.error(f"会话{session_id}创建任务失败")
                        raise RuntimeError(f"会话{session_id}创建任务失败")
                async with self.uow:
                    await self.uow.session.update_latest_message(
                        id=session_id,
                        latest_message=message,
                        timestamp=timestamp or datetime.now(),
                    )
                message_event = MessageEvent(
                    role="user",
                    message=message,
                    attachments=(
                        [File(id=attachment) for attachment in attachments]
                        if attachments
                        else []
                    ),
                )
                event_id = await task.input_stream.put(message_event.model_dump_json())
                message_event.id = event_id
                async with self.uow:
                    await self.uow.session.add_event(session_id, message_event)

                logger.info(f"会话{session_id}准备启动")
                await task.run()
                logger.info(f"会话{session_id}已启动")

                while task and not task.done:
                    event_id, event_data = await task.output_stream.get(
                        start_id=latest_event_id, block_ms=0
                    )
                    latest_event_id = event_id
                    if event_data is None:
                        continue
                    event = TypeAdapter(Event).validate_json(event_data)
                    event.id = event_id
                    async with self.uow:
                        await self.uow.session.update_unread_msg_count(
                            session_id, 0
                        )
                    yield event

                    if isinstance(event, (DoneEvent, ErrorEvent, WaitEvent)):
                        break

                logger.info(f"会话{session_id}运行结束")
        except Exception as e:
            logger.error(f"会话{session_id}聊天失败: {str(e)}")
            event = ErrorEvent(error=str(e))
            try:
                async with self.uow:
                    await self.uow.session.add_event(session_id, event)
            except (asyncio.CancelledError, Exception) as add_error:
                logger.error(
                    f"会话{session_id}添加事件失败(可能是客户端断开连接): {str(add_error)}"
                )
            yield event
        finally:
            try:
                asyncio.create_task(self._safe_update_unread_msg_count(session_id))
            except RuntimeError:
                logger.error(f"会话{session_id}无法创建后台任务：更新未读消息数")

    async def _safe_update_unread_msg_count(self, session_id: str):
        try:
            uow = self.uow_factory()
            async with uow:
                await uow.session.update_unread_msg_count(session_id, 0)
        except Exception as e:
            logger.error(f"会话{session_id}后台更新未读消息数失败, {str()}")

    async def stop_session(self, session_id: str):
        async with self.uow:
            session = await self.uow.session.get_by_id(session_id)
            if session is None:
                logger.error(f"会话{session_id}不存在")
                raise RuntimeError(f"会话{session_id}不存在")

        task = self._get_task(session)
        if task is None:
            logger.error(f"会话{session_id}的任务不存在")
            raise RuntimeError(f"会话{session_id}的任务不存在")

        task.cancel()
        logger.info(f"会话{session_id}已停止")

    async def shutdown(self) -> None:
        await self.task_cls.destroy()
