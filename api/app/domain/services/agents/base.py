from app.domain.models.event import MessageEvent
from app.domain.models.event import ErrorEvent
from app.domain.models.event import ToolEventStatus
from app.domain.models.tool_result import ToolResult
from app.domain.models.event import ToolEvent
import uuid
import asyncio
import logging
from sqlalchemy.dialects.postgresql import Any
from typing import Dict
from typing import List
from app.domain.models.event import Event
from typing import AsyncGenerator
from app.domain.services.tools.base import BaseTool
from app.domain.external.json_parser import JSONParser
from app.domain.models.memory import Memory
from app.domain.external.llm import LLM
from app.domain.models.app_config import Agent_Config
from typing import Optional
from abc import ABC

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """基础智能体类"""

    name: str = ""  # 智能体名称
    _system_prompt: str = ""  # 系统提示词
    _format: Optional[str] = None  # 输出格式
    _retry_interval: float = 1.0  # 重试间隔
    _tool_choice: Optional[str] = None  # 强制工具选择

    def __init__(
        self,
        agent_config: Agent_Config,
        llm: LLM,
        memory: Memory,
        json_parser: JSONParser,
        tools: List[BaseTool],
    ) -> None:
        self._agent_config = agent_config
        self._llm = llm
        self._memory = memory
        self._json_parser = json_parser
        self._tools = tools

    async def _add_to_memory(self, messages: List[Dict[str, Any]]) -> None:
        """将对应信息添加到记忆中"""
        if self._memory.is_empty:
            self._memory.add_messages(
                {
                    "role": "system",
                    "content": self._system_prompt,
                }
            )
        self._memory.add_messages(messages)

    def _get_tool(self, function_name: str) -> Optional[BaseTool]:
        """获取工具"""
        for tool in self._tools:
            if tool.has_tool(function_name):
                return tool
        return None

    def _get_available_tools(self) -> List[Dict[str, Any]]:
        """获取可用工具"""
        available_tools = []
        for tool in self._tools:
            available_tools.extend(tool.get_tools())
        return available_tools

    async def compact_memory(self) -> None:
        """压缩记忆"""
        self._memory.compact()

    async def _invoke_tool(
        self, tool: BaseTool, tool_name: str, tool_args: Dict[str, Any]
    ) -> AsyncGenerator[Event, None]:
        """执行工具"""
        for _ in range(self._agent_config.max_retries):
            try:
                return await tool.invoke(tool_name, **tool_args)
            except Exception as e:
                logger.error(f"执行工具失败: {str(e)}")
                await asyncio.sleep(self._retry_interval)
                continue

        return ToolResult(success=False, error=str(e))

    async def _invoke_llm(
        self, messages: List[Dict[str, Any]], format: Optional[str] = None
    ) -> AsyncGenerator[Event, None]:
        await self._add_to_memory(messages)
        response_format = {"type": format} if format else None

        for _ in range(self._agent_config.max_retries):
            try:
                message = await self._llm.invoke(
                    messages=self._memory.get_messages(),
                    response_format=response_format,
                    tools=self._get_available_tools(),
                    tool_choice=self._tool_choice,
                )

                if message.get("role") == "assistant":
                    if not message.get("content") and not message.get("tool_calls"):
                        logger.warning("大模型返回空内容，重试")
                        await self._add_to_memory(
                            [
                                {"role": "assistant", "content": ""},
                                {"role": "user", "content": "AI无响应内容，请重新生成"},
                            ]
                        )
                        await asyncio.sleep(self._retry_interval)
                        continue

                    filter_message = {
                        "role": "assistant",
                        "content": message.get("content"),
                    }
                    if message.get("tool_calls"):
                        filter_message["tool_calls"] = message.get("tool_calls")[:1]

                else:
                    filter_message = message

                await self._add_to_memory([filter_message])
            except Exception as e:
                logger.error(f"调用大模型失败: {str(e)}")
                await asyncio.sleep(self._retry_interval)
                continue

    async def invoke(
        self, query: str, format: Optional[str] = None
    ) -> AsyncGenerator[Event, None]:
        """运行智能体"""
        format = format if format else self._format
        message = await self._invoke_llm([{"role": "user", "content": query}], format)

        for _ in range(self._agent_config.max_iterations):
            if not message.get("tool_calls"):
                break

            tool_messages = []
            for tool_call in message.get("tool_calls"):
                if not tool_call.get("function"):
                    continue
                tool_id = tool_call.get("id") or str(uuid.uuidv4())
                function_name = tool_call.get("function").get("name")
                function_args = await self._json_parser.invoke(
                    tool_call.get("function").get("arguments")
                )
                tool = self._get_tool(function_name)
                yield ToolEvent(
                    tool_call_id=tool_id,
                    tool_name=tool.name,
                    function_name=function_name,
                    function_args=function_args,
                    status=ToolEventStatus.CALLING,
                )
                result = await self._invoke_tool(tool, function_name, function_args)
                yield ToolEvent(
                    tool_call_id=tool_id,
                    tool_name=tool.name,
                    function_name=function_name,
                    function_args=function_args,
                    function_result=result,
                    status=ToolEventStatus.CALLED,
                )

                tool_messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_id,
                        "function_name": function_name,
                        "content": result.model_dump(),
                    }
                )
            message = await self._invoke_llm(tool_messages, format)
        else:
            yield ErrorEvent(error="达到最大迭代次数")

        yield MessageEvent(message=message["content"])

    @property
    def memory(self) -> Memory:
        return self._memory
