from core.config import get_settings
from typing import BinaryIO
from app.domain.repositories.uow import IUnitOfWork
from typing import Callable
from app.infrastructure.storage.database import get_uow
from app.domain.models.event import DoneEvent
import asyncio
from app.domain.models.event import WaitEvent
from app.domain.models.event import TitleEvent
from app.domain.models.event import A2AToolContent
from app.domain.models.event import MCPToolContent
from app.domain.models.event import FileToolContent
from app.domain.models.event import ShellToolContent
from app.domain.models.event import SearchToolContent
import uuid
from app.domain.models.event import BrowserToolContent
from app.domain.models.event import ToolEventStatus
from fastapi import UploadFile
from app.domain.models.event import ToolEvent
from typing import AsyncGenerator
from app.domain.models.message import Message
from fileinput import filename
from typing import List
from app.domain.models.event import MessageEvent
from pydantic import TypeAdapter
from app.domain.models.event import BaseEvent
from app.domain.models.session import SessionStatus
from app.domain.models.event import ErrorEvent, Event
from app.domain.services.flows.planner_react import PlannerReactFlow
from app.domain.services.tools.a2a import A2ATool
from app.domain.services.tools.mcp import McpTool
from app.domain.external.sandbox import Sandbox
from app.domain.external.search import SearchEngine
from app.domain.external.browser import Browser
from app.domain.external.json_parser import JSONParser
from app.domain.external.file_storage import FileStorage
from app.domain.models.app_config import A2A_Config
from app.domain.models.app_config import Mcp_Config
from app.domain.models.app_config import Agent_Config
from app.domain.external.llm import LLM
import logging
from app.domain.external.task import Task, TaskRunner
import io
from app.domain.models.file import File

logger = logging.getLogger(__name__)


class AgentTaskRunner(TaskRunner):
    """智能体任务执行器"""

    def __init__(
        self,
        llm: LLM,
        agent_config: Agent_Config,
        mcp_config: Mcp_Config,
        a2a_config: A2A_Config,
        session_id: str,
        json_parser: JSONParser,
        browser: Browser,
        search_engine: SearchEngine,
        sandbox: Sandbox,
        file_storage: FileStorage,
        uow_factory: Callable[[...], IUnitOfWork],
    ):
        self.agent_config = agent_config
        self.mcp_config = mcp_config
        self.mcp_tool = McpTool()
        self.a2a_config = a2a_config
        self.a2a_tool = A2ATool()
        self.browser = browser
        self.sandbox = sandbox
        self.session_id = session_id
        self.file_storage = file_storage
        self.uow_factory = uow_factory
        self.uow: IUnitOfWork = uow_factory()
        self.flow = PlannerReactFlow(
            llm=llm,
            agent_config=agent_config,
            json_parser=json_parser,
            session_id=session_id,
            uow_factory=get_uow,
            sandbox=sandbox,
            browser=browser,
            search_engine=search_engine,
            mcp_tool=self.mcp_tool,
            a2a_tool=self.a2a_tool,
        )

    async def _put_and_add_event(self, task: Task, event: Event):
        event_id = await task.output_stream.put(event.model_dump_json())
        event.id = event_id
        async with self.uow:
            await self.uow.session.add_event(self.session_id, event)

    async def _pop_event(self, task: Task):
        event_id, event_str = await task.input_stream.pop()
        if event_str is None:
            logger.warning("AgentTaskRunner接收到空消息")
            return
        event = TypeAdapter(Event).validate_json(event_str)
        event.id = event_id
        return event

    async def _sync_attachment_to_sandbox(self, file_id: str):
        try:
            file_data, file = await self.file_storage.download_file(file_id)
            filepath = f"/home/ubuntu/upload/{file.filename}"
            tool_result = await self.sandbox.file_upload(
                filepath=filepath, file_data=file_data, filename=file.filename
            )

            if tool_result.success:
                file.filepath = filepath
                async with self.uow:
                    await self.uow.file.save(file)
                return file
            else:
                logger.error(f"同步沙箱附件失败: {tool_result.error}")
                return None
        except Exception as e:
            logger.error(f"同步沙箱附件失败: {str(e)}")
            return None

    async def _sync_message_attachments_to_sandbox(self, event: MessageEvent):
        attachments: List[str] = []

        try:
            if event.attachments:
                for attachment in event.attachments:
                    file = await self._sync_attachment_to_sandbox(attachment)
                    if file:
                        attachments.append(file)
                        async with self.uow:
                            await self.uow.session.add_file(self.session_id, file)
            event.attachments = attachments
        except Exception as e:
            logger.error("同步沙箱附件失败")

    @classmethod
    def get_file_size(cls, f: BinaryIO) -> int:
        current_pos = f.tell()
        f.seek(0, 2)
        size = f.tell()
        f.seek(current_pos)
        return size

    async def _sync_attachment_to_storage(self, filepath: str):
        try:
            async with self.uow:
                file = await self.uow.session.get_file_by_path(
                    self.session_id, filepath
                )
            file_data = await self.sandbox.file_download(filepath)
            if file:
                async with self.uow:
                    await self.uow.session.remove_file(self.session_id, file.id)
            filename = filepath.split("/")[-1]
            uploadFile = UploadFile(
                file=file_data, filename=filename, size=self.get_file_size(file_data)
            )
            file = await self.file_storage.upload_file(uploadFile)
            file.filepath = filepath
            async with self.uow:
                await self.uow.session.add_file(self.session_id, file)
            return file
        except Exception as e:
            logger.error(f"同步存储桶附件失败: {str(e)}")
            return None

    async def _sync_message_attachments_to_storage(self, event: MessageEvent):
        attachments: List[File] = []
        try:
            if event.attachments:
                for attachment in event.attachments:
                    file = await self._sync_attachment_to_storage(attachment.filepath)
                    if file:
                        attachments.append(file)
            event.attachments = attachments
        except Exception as e:
            logger.error("同步存储桶附件失败")

    async def _get_browser_screenshot(self) -> str:
        try:
            screenshot = await self.browser.screenshot(full_page=True)
            result = await self.file_storage.upload_file(
                UploadFile(
                    file=io.BytesIO(screenshot),
                    filename=f"{uuid.uuid4()}.png",
                    size=self.get_file_size(io.BytesIO(screenshot)),
                )
            )
            settings = get_settings()
            # https://soon-web.tos-cn-shanghai.volces.com/2026/05/21/71007773-7a85-4a3b-a32a-da91be69026b..png
            return f"https://{settings.tos_bucket}.{settings.tos_endpoint}/{result.key}"
        except Exception as e:
            logger.error(f"获取浏览器截图失败: {str(e)}")
            return ""

    async def _handle_tool_event(self, event: ToolEvent) -> None:
        try:
            if event.status == ToolEventStatus.CALLED:
                if event.tool_name == "browser":
                    screenshot = await self._get_browser_screenshot()
                    event.tool_content = BrowserToolContent(screenshot=screenshot)
                elif event.tool_name == "search":
                    search_results = event.function_result
                    event.tool_content = SearchToolContent(
                        results=search_results.data.results
                    )
                elif event.tool_name == "shell":
                    if "session_id" in event.function_args:
                        shell_result = await self.sandbox.view_shell(
                            event.function_args["session_id"], console=True
                        )
                        event.tool_content = ShellToolContent(
                            console=(shell_result.data or {}).get("console_records", [])
                        )
                    else:
                        event.tool_content = ShellToolContent(content="(No Console)")
                elif event.tool_name == "file":
                    if "filepath" in event.function_args:
                        file_result = await self.sandbox.file_read(
                            event.function_args["filepath"]
                        )
                        event.tool_content = FileToolContent(
                            content=file_result.data.get("content", "")
                        )
                        await self._sync_attachment_to_sandbox(
                            event.function_args["filepath"]
                        )
                    else:
                        event.tool_content = FileToolContent(content="(No Content)")
                elif event.tool_name in ["a2a", "mcp"]:
                    if event.function_result:
                        if (
                            hasattr(event.function_result, "data")
                            and event.function_result.data
                        ):
                            event.tool_content = (
                                MCPToolContent(result=event.function_result.data)
                                if event.tool_name == "mcp"
                                else A2AToolContent(
                                    a2a_result=event.function_result.data
                                )
                            )
                        elif (
                            hasattr(event.function_result, "success")
                            and event.function_result.success
                        ):
                            result_data = (
                                event.function_result.model_dump()
                                if hasattr(event.function_result, "model_dump")
                                else str(event.function_result)
                            )
                            event.tool_content = (
                                MCPToolContent(result=result_data)
                                if event.tool_name == "mcp"
                                else A2AToolContent(a2a_result=result_data)
                            )
                        else:
                            event.tool_content = (
                                MCPToolContent(result=str(event.function_result))
                                if event.tool_name == "mcp"
                                else A2AToolContent(
                                    a2a_result=str(event.function_result)
                                )
                            )
                    else:
                        event.tool_content = (
                            MCPToolContent(result="(No Content)")
                            if event.tool_name == "mcp"
                            else A2AToolContent(a2a_result="(No Content)")
                        )
        except Exception as e:
            logger.error(f"处理工具事件失败: {str(e)}")

    async def _run_flow(self, message_obj: Message) -> AsyncGenerator[BaseEvent, None]:
        if not message_obj.message:
            logger.warning("AgentTaskRunner接收到空消息")
            yield ErrorEvent(error="AgentTaskRunner接收到空消息")
            return
        async for event in self.flow.invoke(message_obj):
            if isinstance(event, ToolEvent):
                await self._handle_tool_event(event)
            elif isinstance(event, MessageEvent):
                await self._sync_message_attachments_to_storage(event)
            yield event

    async def invoke(self, task: Task):
        try:
            logger.debug("开始调用agent任务执行器")
            await self.sandbox._ensure_sandbox_exists()
            await self.mcp_tool.initialize(self.mcp_config)
            await self.a2a_tool.initialize(self.a2a_config)

            while not await task.input_stream.is_empty():
                print("task.input_stream.is_empty()", await task.input_stream.is_empty())
                event = await self._pop_event(task)
                message = ""

                if isinstance(event, MessageEvent):
                    message = event.message or ""
                    await self._sync_message_attachments_to_sandbox(event)

                    message_obj = Message(
                        message=message,
                        attachments=[
                            attachment.filepath for attachment in event.attachments
                        ],
                    )

                    logger.info(f"开始跑流程，message_obj: {message_obj}")
                    async for event in self._run_flow(message_obj):
                        await self._put_and_add_event(task, event)

                        if isinstance(event, TitleEvent):
                            async with self.uow:
                                await self.uow.session.update_title(
                                    self.session_id, event.title
                                )
                        elif isinstance(event, MessageEvent):
                            async with self.uow:
                                await self.uow.session.update_latest_message(
                                    self.session_id, event.message, event.created_at
                                )
                                await self.uow.session.increment_unread_msg_count(
                                    self.session_id
                                )
                        elif isinstance(event, WaitEvent):
                            async with self.uow:
                                await self.uow.session.update_status(
                                    self.session_id, SessionStatus.WAITING
                                )
                            return

                    if await task.input_stream.is_empty():
                        break
            async with self.uow:
                await self.uow.session.update_status(
                    self.session_id, SessionStatus.COMPLETED
                )
        except asyncio.CancelledError:
            logger.info(f"任务被取消: {task.id}")
            await self._put_and_add_event(task, DoneEvent())
            async with self.uow:
                await self.uow.session.update_status(
                    self.session_id, SessionStatus.COMPLETED
                )
            raise
        except Exception as e:
            logger.error(f"任务执行失败: {task.id}", exc_info=True)
            await self._put_and_add_event(
                task, ErrorEvent(error=f"AgentTaskRunner.invoke error: {str(e)}")
            )
            async with self.uow:
                await self.uow.session.update_status(
                    self.session_id, SessionStatus.COMPLETED
                )
        finally:
            await self._cleanup_tools()

    async def destroy(self):
        logger.info(f"销毁任务执行器: {self.session_id}")
        if self.sandbox:
            await self.sandbox.destroy()
        await self._cleanup_tools()

    async def _cleanup_tools(self):
        if self.mcp_tool:
            await self.mcp_tool.cleanup()
        if self.a2a_tool:
            await self.a2a_tool.cleanup()

    async def on_done(self, task: Task):
        logger.info(f"任务执行完成: {task.id}")
