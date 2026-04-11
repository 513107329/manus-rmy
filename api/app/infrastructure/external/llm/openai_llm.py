from app.application.errors.exceptions import InternalServerErrorException
import logging
from typing import Any
from typing import Dict
from typing import List
from app.domain.models.app_config import LLM_Config
from app.domain.external.llm import LLM
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


class OpenAILLM(LLM):
    def __init__(self, llm_config: LLM_Config):
        self._llm_config = llm_config
        self._client = AsyncOpenAI(
            base_url=llm_config.base_url,
            api_key=llm_config.api_key,
        )
        self._timeout = 3600

    @property
    def model_name(self) -> str:
        return self._llm_config.model_name

    @property
    def temperature(self) -> float:
        return self._llm_config.tempature

    @property
    def max_tokens(self) -> int:
        return self._llm_config.max_tokens

    async def invoke(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]] = None,
        response_format: Dict[str, Any] = None,
        tool_choice: str = None,
    ) -> Dict[str, Any]:
        try:
            if tools:
                response = await self._client.chat.completions.create(
                    model=self.model_name,
                    messages=messages,
                    tools=tools,
                    tool_choice=tool_choice,
                    response_format=response_format,
                    temperature=self.temperature,
                    max_tokens=self.max_tokens,
                    parallel_tool_calls=False,
                    timeout=self._timeout,
                )
            else:
                response = await self._client.chat.completions.create(
                    model=self.model_name,
                    messages=messages,
                    temperature=self.temperature,
                    max_tokens=self.max_tokens,
                )
            return response.model_dump().choices[0].message
        except Exception as e:
            logger.error(f"调用LLM失败: {str(e)}")
            raise InternalServerErrorException(f"调用LLM失败: {str(e)}")
