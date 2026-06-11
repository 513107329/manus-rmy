import asyncio
import logging
from typing import TYPE_CHECKING, Any, List, Optional

from markdownify import markdownify
from playwright.async_api import async_playwright

from app.domain.external.browser import Browser as BrowserProtocol
from app.domain.external.llm import LLM
from app.domain.models.tool_result import ToolResult
from app.infrastructure.external.browser.playwrightBrowserFunc import (
    GET_INTERACTIVE_VISIBLE_CONTENT_FUNC,
    GET_VISIBLE_CONTENT_FUNC,
    INJECT_CONSOLE_FUNC,
)

if TYPE_CHECKING:
    from playwright.async_api import Browser as PwBrowser, Page, Playwright

logger = logging.getLogger(__name__)


class PlayWrightBrowser(BrowserProtocol):
    def __init__(self, cdp_url: str, llm: Optional[LLM] = None):
        self.cdp_url = cdp_url
        self.llm: Optional[LLM] = llm
        self.playwright: Optional["Playwright"] = None
        self.browser: Optional["PwBrowser"] = None
        self.page: Optional["Page"] = None

    async def initialize(self) -> bool:
        max_retries = 5
        retry_interval = 1

        for attempt in range(max_retries):
            try:
                self.playwright = await async_playwright().start()
                logger.info("Connecting to CDP: %s", self.cdp_url)
                self.browser = await self.playwright.chromium.connect_over_cdp(
                    self.cdp_url,
                    is_local=self.cdp_url.startswith("http://127.0.0.1")
                    or self.cdp_url.startswith("http://localhost"),
                )

                contexts = self.browser.contexts
                if contexts and contexts[0].pages:
                    self.page = contexts[0].pages[-1]
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
                await self.browser.close()
            elif self.page and not self.page.is_closed():
                await self.page.close()

            if self.playwright:
                await self.playwright.stop()
        except Exception as e:
            logger.error("清理浏览器失败: %s", e)
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
        logger.info(f"开始提取交互元素")
        await self._ensure_page_exist()

        self.page.interactive_elements_cache = []

        interactive_elements = await self.page.evaluate(
            GET_INTERACTIVE_VISIBLE_CONTENT_FUNC
        )
        logger.info(f"提取交互元素结束: {interactive_elements}")
        self.page.interactive_elements_cache = interactive_elements

        formatted_elements = []

        for element in interactive_elements:
            logger.info("formatting element: %s", element)
            formatted_elements.append(f"{element['index']}:{element['outerHTML']}")

        return formatted_elements

    async def navigate(self, url: str) -> ToolResult:
        await self._ensure_page_exist()
        try:
            logger.info(f"开始跳转: {url}")
            await self.page.goto(url)
            logger.info(f"跳转结束: {url}")
            data = await self._extract_interactive_content()
            logger.info(f"navigate data: {data}")
            return ToolResult(
                success=True,
                data=data,
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

    async def screenshot(self, full_page: Optional[bool] = None) ->  bytes:
        await self._ensure_page_exist()
        if full_page:
            screenshot = await self.page.screenshot(full_page=True, type="png")
        else:
            screenshot = await self.page.screenshot(type="png")
        return screenshot

    async def console_exec(self, javascript: str) -> ToolResult:
        await self._ensure_page_exist()
        try:
            await self.page.evaluate(INJECT_CONSOLE_FUNC)
        except Exception as e:
            logger.error(f"注入window.console.logs失败: {str(e)}")

        result = await self.page.evaluate(javascript)
        return ToolResult(success=True, message="执行成功", data=result)

    async def console_view(self, max_lines: Optional[int] = None) -> ToolResult:
        await self._ensure_page_exist()

        logs = await self.page.evaluate(
            """
            () => {
                return window.console.logs || []
            }
        """
        )

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

    async def input(
        self,
        index: Optional[int] = None,
        coordinate_x: Optional[float] = None,
        coordinate_y: Optional[float] = None,
        text: Optional[str] = None,
        press_enter: Optional[bool] = None,
    ) -> ToolResult:
        await self._ensure_page_exist()
        if index is not None:
            try:
                element = await self._get_element_by_id(index)
                if element is None:
                    return ToolResult(success=False, message="元素不存在")
                try:
                    await element.fill("")
                    await element.type(text)
                except Exception:
                    await element.click()
                    await element.type(text)
            except Exception as e:
                logger.error(f"输入失败: {e}")
                return ToolResult(success=False, message=f"输入失败: {e}")
        elif coordinate_x is not None and coordinate_y is not None:
            try:
                await self.page.mouse.click(x=coordinate_x, y=coordinate_y)
                await self.page.keyboard.type(text)
            except Exception as e:
                logger.error(f"输入失败: {e}")
                return ToolResult(success=False, message=f"输入失败: {e}")
        if press_enter:
            await self.page.keyboard.press("Enter")
        return ToolResult(success=True, message="输入成功")

    async def move_mouse(
        self,
        coordinate_x: Optional[float] = None,
        coordinate_y: Optional[float] = None,
    ) -> ToolResult:
        await self._ensure_page_exist()
        try:
            if coordinate_x is not None and coordinate_y is not None:
                await self.page.mouse.move(x=coordinate_x, y=coordinate_y)
            return ToolResult(success=True, message="移动成功")
        except Exception as e:
            logger.error(f"移动失败: {e}")
            return ToolResult(success=False, message=f"移动失败: {e}")

    async def press_key(self, key: str) -> ToolResult:
        await self._ensure_page_exist()
        try:
            await self.page.keyboard.press(key)
            return ToolResult(success=True, message="按键成功")
        except Exception as e:
            logger.error(f"按键失败: {e}")
            return ToolResult(success=False, message=f"按键失败: {e}")

    async def select_option(self, index: int, option: int) -> ToolResult:
        await self._ensure_page_exist()
        try:
            element = await self._get_element_by_id(index)
            if element is None:
                return ToolResult(success=False, message="元素不存在")
            await element.select_option(index=option)
            return ToolResult(success=True, message="选择成功")
        except Exception as e:
            logger.error(f"选择失败: {e}")
            return ToolResult(success=False, message=f"选择失败: {e}")
