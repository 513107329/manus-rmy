from typing import Dict
from typing import List
from typing import Union
from typing import Optional
from typing import Any
from typing import Protocol


class JSONParser(Protocol):
    """json字符串解析器"""

    async def invoke(
        self, text: str, default_value: Optional[Any] = None
    ) -> Union[Dict, List, Any]:
        """修复json方法"""
        ...
