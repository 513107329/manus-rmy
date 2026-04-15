import inspect
import inspect
from app.domain.models.tool_result import ToolResult
from typing import Callable
from typing import List
from typing import Any
from typing import Dict


def tool(
    name: str, description: str, params: Dict[str, Dict[str, Any]], required: List[str]
) -> Callable:
    """OpenAI工具装饰器，用于将一个函数/方法添加上对应的工具声明"""

    def decorator(func):
        """装饰器函数"""
        tool_schema = {
            "type": "function",
            "name": name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": params,
                "required": required,
            },
        }

        func._tool_name = name
        func._tool_description = description
        func._tool_schema = tool_schema
        return func

    return decorator


class BaseTool:
    """基础工具类，管理统一的工具集"""

    name: str = ""  # 工具集的名称

    def __init__(self) -> None:
        self._tools_cache = None

    @classmethod
    def _filter_parameters(
        cls, method: Callable, kwargs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """筛选传递的kwargs参数，只保留method需要的参数，其余的剔除"""
        filter_args = {}
        sign = inspect.signature(method)

        for key, value in kwargs.items():
            if key in sign.parameters:
                filter_args[key] = value

        return filter_args

    def get_tools(self) -> List[Dict[str, Any]]:
        """获取所有工具"""
        if self._tools_cache is None:
            self._tools_cache = []
            for _, method in inspect.getmembers(self, inspect.ismethod):
                if hasattr(method, "_tool_schema"):
                    self._tools_cache.append(getattr(method, "_tool_schema"))
        return self._tools_cache

    def has_tool(self, tool_name: str) -> bool:
        """判断是否存在该工具"""
        for _, method in inspect.getmembers(self, inspect.ismethod):
            if (
                hasattr(method, "_tool_name")
                and getattr(method, "_tool_name") == tool_name
            ):
                return True
        return False

    async def invoke(self, tool_name: str, **kwargs) -> ToolResult:
        """执行工具"""

        # 1.循环遍历工具集中的所有方法
        for _, method in inspect.getmembers(self, inspect.ismethod):
            # 2.判断方法是否存在_tool_name属性，有则为工具方法
            if (
                hasattr(method, "_tool_name")
                and getattr(method, "_tool_name") == tool_name
            ):
                # 3.筛选传递的kwargs参数，只保留method需要的参数，其余的剔除
                filter_args = self._filter_parameters(method, kwargs)
                try:
                    result = await method(**filter_args)
                    return ToolResult(success=True, data=result)
                except Exception as e:
                    return ToolResult(success=False, message=str(e))

        return ToolResult(success=False, message=f"工具{tool_name}未找到")
