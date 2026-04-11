from typing import Any
from typing import Dict
from typing import List
from typing import Protocol


class LLM(Protocol):
    def invoke(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        tool_choice: str,
        model: str,
        temperature: float,
        max_tokens: int,
    ) -> Dict[str, Any]:
        """
        Invoke the LLM with the given messages and tools.

        Args:
            messages: The messages to send to the LLM.
            tools: The tools to use with the LLM.
            tool_choice: The tool choice for the LLM.
            model: The model to use for the LLM.
            temperature: The temperature to use for the LLM.
            max_tokens: The maximum number of tokens to use for the LLM.

        Returns:
            The response from the LLM.
        """
        ...
