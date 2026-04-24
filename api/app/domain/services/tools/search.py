from typing import Optional
from app.domain.models.tool_result import ToolResult
from app.domain.models.search import SearchResults
from app.domain.external.search import SearchEngine
from app.domain.services.tools.base import BaseTool, tool


class SearchTool(BaseTool):
    name: str = "search"
    description: str = "全网搜索引擎工具"

    def __init__(self, search_engine: SearchEngine) -> None:
        self._search_engine = search_engine

    @tool(
        name="search_web",
        description="全网搜索引擎工具",
        params={
            "query": {"type": "string", "description": "搜索内容"},
            "date_range": {
                "type": "string",
                "enum": [
                    "all",
                    "past_hour",
                    "past_day",
                    "past_week",
                    "past_month",
                    "past_year",
                ],
                "description": "时间范围",
            },
        },
        required=["query"],
    )
    async def search_web(
        self, query: str, date_range: Optional[str] = None
    ) -> ToolResult[SearchResults]:
        return await self._search_engine.invoke(query, date_range)
