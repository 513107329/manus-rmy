from app.domain.models.tool_result import ToolResult
from typing import Protocol
from app.domain.models.search import SearchResults


class SearchEngine(Protocol):
    async def invoke(
        self, query: str, date_range: str
    ) -> ToolResult[SearchResults]: ...
