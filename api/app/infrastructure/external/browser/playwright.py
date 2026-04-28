from app.infrastructure.external.browser.playwrightBrowserFunc import (
    GET_VISIBLE_CONTENT_FUNC,
)
import asyncio
from app.domain.models.tool_result import ToolResult
import asyncio
import logging
from app.domain.external.llm import LLM
from typing import Optional
from app.domain.external.browser import Browser as BrowserProtocol
from playwright.async_api import Playwright, Browser, Page, async_playwright
from markdownify import markdownify

logger = logging.getLogger(__name__)


class PlayWrightBrowser(BrowserProtocol):
    def __init__(self, cdp_url: str, llm: Optional[LLM] = None):
        self.cdp_url = cdp_url
        self.llm: Optional[LLM] = llm
        self.playwright: Optional[Playwright] = None
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None

    async def initialize(self) -> bool:
        max_retries = 5
        retry_interval = 1

        for attempt in range(max_retries):
            try:
                self.playwright = await async_playwright().start()
                self.browser = await self.playwright.chromium.connect(self.cdp_url)

                contexts = self.browser.contexts

                if contexts and len(contexts[0].pages) == 1:
                    page = contexts[0].pages[0]

                    if (
                        page.url == "chrome://newtab/"
                        or page.url == "about:blank"
                        or not page.url
                    ):
                        self.page = page
                else:
                    context = (
                        contexts[0] if contexts else await self.browser.new_context()
                    )
                    self.page = await context.new_page()
                return True
            except Exception as e:
                await self.cleanup()
                logger.error(f"初始化浏览器失败: {e}")

                if attempt == max_retries - 1:
                    logger.error(f"初始化浏览器失败,已重试({max_retries})次")
                    return False

                await asyncio.sleep(retry_interval)
                retry_interval = min(retry_interval * 2, 10)

    async def cleanup(self) -> None:
        try:
            if self.browser:
                browser = self.browser
                contexts = browser.contexts

                for context in contexts:
                    pages = context.pages

                    for page in pages:
                        if not page.is_closed():
                            await page.close()

                await browser.close()

            if not self.page.is_closed():
                await self.page.close()

            if self.browser:
                await self.browser.close()

            if self.playwright:
                await self.playwright.stop()
        except Exception as e:
            logger.error(f"清理浏览器失败: {e}")
        finally:
            self.page = None
            self.browser = None
            self.playwright = None

    async def _ensure_browser_exist(self) -> None:
        if not self.browser or not self.page:
            if not await self.initialize():
                raise Exception("初始化浏览器失败")

    async def _ensure_page_exist(self) -> None:
        await self._ensure_browser_exist()
        if not self.page:
            self.page = await self.browser.new_page()
        else:
            contexts = self.browser.contexts

            if contexts:
                default_context = contexts[0]
                pages = default_context.pages

                if pages:
                    latest_page = pages[-1]
                    if self.page != latest_page:
                        self.page = latest_page

    async def wait_for_page_load(self, time: int = 15) -> bool:
        await self._ensure_page_exist()

        start_time = asyncio.get_event_loop().time()
        check_interval = 5

        while asyncio.get_event_loop().time() - start_time < time:
            try:
                if await self.page.evaluate("document.readyState === 'complete'"):
                    return True
            except Exception as e:
                logger.error(f"等待页面加载失败: {e}")
                return False
            await asyncio.sleep(check_interval)
        return False

    async def _extract_content(self) -> str:
        visible_content = await self.page.evaluate(GET_VISIBLE_CONTENT_FUNC)
        markdown_content = markdownify(visible_content)

        MAX_CONTENT_LEN = min(len(markdown_content), 50000)

        if self.llm:
            response = await self.llm.invoke(
                messages=[
                    {
                        "role": "system",
                        "content": "你是一个网页内容提取工具，请提取网页中的所有信息，并以markdown格式返回。",
                    },
                    {
                        "role": "user",
                        "content": f"请提取网页中的所有信息，并以markdown格式返回。\n\n{markdown_content[:MAX_CONTENT_LEN]}",
                    },
                ]
            )
            return response.get("content", "")
        else:
            return markdown_content[:MAX_CONTENT_LEN]
