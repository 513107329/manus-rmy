from pydantic import Field
from typing import List
from typing import Optional
from pydantic import BaseModel


class SearchResultItem(BaseModel):
    url: str = ""
    title: str = ""
    snippet: str = ""


class SearchResults(BaseModel):
    query: str = ""
    date_range: Optional[str] = None
    total: int = 0
    results: List[SearchResultItem] = Field(default_factory=list)
