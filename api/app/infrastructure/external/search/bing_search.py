import asyncio
from app.domain.models.search import SearchResultItem
from time import time
from typing import Optional
from app.domain.models.search import SearchResults
from app.domain.models.tool_result import ToolResult
import httpx
from app.domain.external.search import SearchEngine
from bs4 import BeautifulSoup
import re


class BingSearchEngine(SearchEngine):
    def __init__(self) -> None:
        self.base_url = "https://www.bing.com/search"
        self.headers = {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
            "accept-language": "en-US,en;q=0.9",
            "accept-encoding": "gzip, deflate",
            "connection": "keep-alive",
            "upgrade-insecure-requests": "1",
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        }
        self.cookies = httpx.Cookies()

    async def invoke(
        self, query: str, date_range: Optional[str] = None
    ) -> ToolResult[SearchResults]:
        params = {"q": query}
        if date_range and date_range != "all":
            days_since_epoch = int(time.time() / (24 * 60 * 60))

            date_mapping = {
                "past_day": 'ex1%3a"ez1"',
                "past_week": 'ex1%3a"ez2"',
                "past_month": 'ex1%3a"ez3"',
                "past_year": f'ex1%3a"ez5_{days_since_epoch - 365}_{days_since_epoch}"',
            }
            if date_range in date_mapping:
                params["filters"] = date_mapping[date_range]

        try:
            async with httpx.AsyncClient(
                headers=self.headers,
                cookies=self.cookies,
                timeout=60,
                follow_redirects=True,
            ) as client:
                response = await client.get(self.base_url, params=params)
                response.raise_for_status()

                self.cookies.update(response.cookies)

                soup = BeautifulSoup(response.text, "html.parser")

                result_items = soup.find_all("li", class_="b_algo")

                results = []

                for result_item in result_items:
                    try:
                        url = result_item.find("a")["href"]
                        title = result_item.find("h2").get_text(strip=True)
                        snippet = ""
                        snippets_items = result_item.find_all(
                            ["p", "div"],
                            class_=re.compile(r"b_lineclamp|b_descript|b_caption"),
                        )
                        if snippets_items:
                            snippet = snippets_items[0].get_text(strip=True)

                        if not snippet:
                            p_tags = result_item.find_all("p")
                            for p in p_tags:
                                text = p.get_text(strip=True)
                                if len(text) > 20:
                                    snippet = text
                                    break
                        if not snippet:
                            all_text = result_item.get_text(strip=True)
                            sentences = re.split(r"[.!?\n。！]]", all_text)

                            for sentence in sentences:
                                clean_sentence = sentence.strip()
                                if len(clean_sentence) > 20 and clean_sentence != title:
                                    snippet = clean_sentence
                                    break
                        results.append(
                            SearchResultItem(url=url, title=title, snippet=snippet)
                        )
                    except Exception as e:
                        continue

                total_result = 0

                result_stats = soup.find_all(string=re.compile(r"\d+[,\d+]\s*results"))
                if result_stats:
                    for stat in result_stats:
                        match = re.search(r"(\d+[,\d+])\s*results", stat)
                        if match:
                            try:
                                total_result = match.group(1).replace(",", "")
                                break
                            except Exception as e:
                                continue

                if total_result == 0:
                    count_element = soup.find_all(
                        ["span", "p", "div"],
                        class_=re.compile(r"sb_count|b_focusTextMedium"),
                    )
                    for element in count_element:
                        text = element.get_text(strip=True)
                        match = re.search(r"(\d+[,\d+])\s*results", text)
                        if match:
                            try:
                                total_result = match.group(1).replace(",", "")
                                break
                            except Exception as e:
                                continue

                return ToolResult(
                    success=True,
                    data=SearchResults(
                        query=query,
                        date_range=date_range,
                        total=total_result,
                        results=results,
                    ),
                )
        except Exception as e:
            error_results = SearchResults(
                query=query,
                date_range=date_range,
                total=0,
                results=[],
            )
            return ToolResult(success=False, error=str(e), data=error_results)


if __name__ == "__main__":
    import asyncio

    async def test():
        search_engine = BingSearchEngine()
        result = await search_engine.invoke("小米股价")
        print(result)

    asyncio.run(test())
