from app.infrastructure.external.browser.playwrightBrowserFunc import (
    GET_VISIBLE_CONTENT_FUNC,
    GET_INTERACTIVE_VISIBLE_CONTENT_FUNC,
)
import asyncio
from app.domain.models.tool_result import ToolResult
import logging
from app.domain.external.llm import LLM
from typing import Optional
from app.domain.external.browser import Browser as BrowserProtocol
from playwright.async_api import Playwright, Browser, Page, async_playwright
from markdownify import markdownify
from typing import List, Any

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

    async def _extract_interactive_content(self) -> List[str]:
        await self._ensure_page_exist()

        self.page.interactive_elements_cache = []

        interactive_elements = await self.page.evaluate(
            GET_INTERACTIVE_VISIBLE_CONTENT_FUNC
        )

        self.page.interactive_elements_cache = interactive_elements

        formatted_elements = []

        for element in interactive_elements:
            formatted_elements.append(
                f"{element['index']}:<{element.tagName}>{element.text}</{element.tagName}>"
            )

        return formatted_elements

    async def navigate(self, url: str) -> ToolResult:
        await self._ensure_page_exist()
        try:
            await self.page.goto(url)
            return ToolResult(
                success=True,
                data=await self._extract_interactive_content(),
                message="页面导航成功",
            )
        except Exception as e:
            logger.error(f"页面跳转失败: {e}")
            return ToolResult(success=False, message=f"页面导航失败: {e}")

    async def view_page(self) -> ToolResult:
        await self._ensure_page_exist()
        await self.wait_for_page_load()
        interactive_elements = await self._extract_interactive_content()

        return ToolResult(
            success=True,
            message="提取元素成功",
            data={
                "content": await self._extract_content(),
                "interactive_elements": interactive_elements,
            },
        )

    async def restart(self, url: str) -> ToolResult:
        await self.cleanup()
        return await self.navigate(url)

    async def scroll_up(self, to_top: Optional[bool] = None) -> ToolResult:
        await self._ensure_page_exist()
        try:
            if to_top:
                await self.page.evaluate("window.scrollTo(0, 0)")
            else:
                await self.page.evaluate("window.scrollBy(0, -window.innerHeight)")
            return ToolResult(success=True, message="滚动成功")
        except Exception as e:
            logger.error(f"滚动失败: {e}")
            return ToolResult(success=False, message=f"滚动失败: {e}")

    async def scroll_down(self, to_bottom: Optional[bool] = None) -> ToolResult:
        await self._ensure_page_exist()
        try:
            if to_bottom:
                await self.page.evaluate(
                    "window.scrollTo(0, document.body.scrollHeight)"
                )
            else:
                await self.page.evaluate("window.scrollBy(0, window.innerHeight)")
            return ToolResult(success=True, message="滚动成功")
        except Exception as e:
            logger.error(f"滚动失败: {e}")
            return ToolResult(success=False, message=f"滚动失败: {e}")

    async def screen_shot(self, full_page: Optional[bool] = None) -> ToolResult:
        await self._ensure_page_exist()
        try:
            if full_page:
                screenshot = await self.page.screenshot(full_page=True, type="png")
            else:
                screenshot = await self.page.screenshot(type="png")
            return ToolResult(success=True, message="截图成功", data=screenshot)
        except Exception as e:
            logger.error(f"截图失败: {e}")
            return ToolResult(success=False, message=f"截图失败: {e}")

    async def console_exec(self, javascript: str) -> ToolResult:
        await self._ensure_page_exist()
        try:
            result = await self.page.evaluate(javascript)
            return ToolResult(success=True, message="执行成功", data=result)
        except Exception as e:
            logger.error(f"执行失败: {e}")
            return ToolResult(success=False, message=f"执行失败: {e}")

    async def console_view(self, max_lines: Optional[int] = None) -> ToolResult:
        await self._ensure_page_exist()

        logs = await self.page.evaluate("""
            () => {
                return window.console.logs || []
            }
        """)

        if max_lines is not None:
            logs = logs[-max_lines:]

        return ToolResult(success=True, message="获取成功", data=logs)

    async def _get_element_by_id(self, index: int) -> Optional[Any]:
        await self._ensure_page_exist()
        try:
            if (
                not hasattr(self.page, "interactive_elements_cache")
                or not self.page.interactive_elements_cache
                or index >= len(self.page.interactive_elements)
            ):
                return None
            selector = f'[data-manus-id="manus-element-{index}"]'
            return await self.page.query_selector(selector)
        except Exception as e:
            logger.error(f"获取元素失败: {e}")
            return None

    async def click(
        self,
        index: Optional[int] = None,
        coordinate_x: Optional[float] = None,
        coordinate_y: Optional[float] = None,
    ) -> ToolResult:
        await self._ensure_page_exist()
        try:
            if index is not None:
                element = await self._get_element_by_id(index)
                if element is None:
                    return ToolResult(success=False, message="元素不存在")
                is_visible = await self.page.evaluate(
                    """
                    (element) => {
                        if(!element) return false;
                        const rect = element.getBoundingClientRect();
                        const style = element.getComputedStyle();
                        return !(
                            rect.width === 0 ||
                            rect.height === 0 ||
                            style.display === 'none' ||
                            style.visibility === 'hidden' ||
                            style.opacity === '0'
                        );
                    }
                """,
                    element,
                )

                if not is_visible:
                    await self.page.evaluate(
                        """
                    (element) => {
                        element.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                        });
                    }
                    """,
                        element,
                    )
                await asyncio.sleep(1)
                await element.click(timeout=5000)
            elif coordinate_x is not None and coordinate_y is not None:
                await self.page.mouse.click(x=coordinate_x, y=coordinate_y)
            return ToolResult(success=True, message="点击成功")
        except Exception as e:
            logger.error(f"点击失败: {e}")
            return ToolResult(success=False, message=f"点击失败: {e}")
