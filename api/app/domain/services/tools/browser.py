from typing import Optional
from app.domain.models.tool_result import ToolResult
from app.domain.services.tools.base import BaseTool, tool
from app.domain.external.browser import Browser


class BrowserTool(BaseTool):
    name = "browser"

    def __init__(self, browser: Browser) -> None:
        super().__init__()
        self.browser = browser

    @tool(
        name="browser_view",
        description="查看当前浏览器页面内容，用于确认已打开的页面的最新状态",
        parameters={},
        required=[],
    )
    async def browser_view(self) -> ToolResult:
        return await self.browser.view_page()

    @tool(
        name="browser_navigate",
        description="导航到指定URL",
        parameters={
            "url": {
                "type": "string",
                "description": "访问的完整URL，例如：https://www.baidu.com",
            }
        },
        required=["url"],
    )
    async def browser_navigate(self, url: str) -> ToolResult:
        return await self.browser.navigate(url)

    @tool(
        name="browser_restart",
        description="重启浏览器",
        parameters={
            "url": {
                "type": "string",
                "description": "访问的完整URL，例如：https://www.baidu.com",
            }
        },
        required=["url"],
    )
    async def browser_restart(self, url: str) -> ToolResult:
        return await self.browser.restart(url)

    @tool(
        name="browser_click",
        description="点击页面元素",
        parameters={
            "index": {
                "type": "integer",
                "description": "元素的索引",
            },
            "coordinate_x": {
                "type": "number",
                "description": "元素的x坐标",
            },
            "coordinate_y": {
                "type": "number",
                "description": "元素的y坐标",
            },
        },
        required=[],
    )
    async def browser_click(
        self,
        index: Optional[int] = None,
        coordinate_x: Optional[float] = None,
        coordinate_y: Optional[float] = None,
    ) -> ToolResult:
        return await self.browser.click(index, coordinate_x, coordinate_y)

    @tool(
        name="browser_input",
        description="填充页面元素",
        parameters={
            "index": {
                "type": "integer",
                "description": "元素的索引",
            },
            "coordinate_x": {
                "type": "number",
                "description": "元素的x坐标",
            },
            "coordinate_y": {
                "type": "number",
                "description": "元素的y坐标",
            },
            "text": {
                "type": "string",
                "description": "填充的文本",
            },
            "press_enter": {
                "type": "boolean",
                "description": "是否按回车键",
            },
        },
        required=["text", "press_enter"],
    )
    async def browser_input(
        self,
        text: str,
        press_enter: bool,
        index: Optional[int] = None,
        coordinate_x: Optional[float] = None,
        coordinate_y: Optional[float] = None,
    ) -> ToolResult:
        return await self.browser.input(
            text, press_enter, index, coordinate_x, coordinate_y
        )

    @tool(
        name="move_mouse",
        description="移动鼠标到指定位置",
        parameters={
            "coordinate_x": {
                "type": "number",
                "description": "鼠标的x坐标",
            },
            "coordinate_y": {
                "type": "number",
                "description": "鼠标的y坐标",
            },
        },
        required=[],
    )
    async def move_mouse(
        self,
        coordinate_x: Optional[float] = None,
        coordinate_y: Optional[float] = None,
    ) -> ToolResult:
        return await self.browser.move_mouse(coordinate_x, coordinate_y)

    @tool(
        name="press_key",
        description="按下键盘按键",
        parameters={
            "key": {
                "type": "string",
                "description": "按下的按键",
            }
        },
        required=["key"],
    )
    async def press_key(
        self,
        key: str,
    ) -> ToolResult:
        return await self.browser.press_key(key)

    @tool(
        name="select_option",
        description="选择下拉框选项",
        parameters={
            "index": {
                "type": "integer",
                "description": "下拉框的索引",
            },
            "option": {
                "type": "integer",
                "description": "选项的索引",
            },
        },
        required=["index", "option"],
    )
    async def select_option(
        self,
        index: int,
        option: int,
    ) -> ToolResult:
        return await self.browser.select_option(index, option)

    @tool(
        name="scroll_up",
        description="向上滚动页面",
        parameters={
            "to_up": {
                "type": "boolean",
                "description": "是否滚动到页面顶部",
            }
        },
        required=[],
    )
    async def scroll_up(
        self,
        to_up: Optional[bool] = None,
    ) -> ToolResult:
        return await self.browser.scroll_up(to_up)

    @tool(
        name="scroll_down",
        description="向下滚动页面",
        parameters={
            "to_down": {
                "type": "boolean",
                "description": "是否滚动到页面底部",
            }
        },
        required=[],
    )
    async def scroll_down(
        self,
        to_down: Optional[bool] = None,
    ) -> ToolResult:
        return await self.browser.scroll_down(to_down)

    @tool(
        name="browser_screenshot",
        description="截取当前浏览器页面",
        parameters={},
        required=[],
    )
    async def browser_screenshot(self) -> ToolResult:
        return await self.browser.screenshot()

    @tool(
        name="console_exec",
        description="执行JavaScript代码",
        parameters={
            "javascript": {
                "type": "string",
                "description": "要执行的JavaScript代码",
            }
        },
        required=["javascript"],
    )
    async def console_exec(
        self,
        javascript: str,
    ) -> ToolResult:
        return await self.browser.console_exec(javascript)

    @tool(
        name="console_view",
        description="查看控制台输出",
        parameters={
            "max_lines": {
                "type": "integer",
                "description": "最大行数",
            }
        },
        required=[],
    )
    async def console_view(
        self,
        max_lines: Optional[int] = None,
    ) -> ToolResult:
        return await self.browser.console_view(max_lines)
