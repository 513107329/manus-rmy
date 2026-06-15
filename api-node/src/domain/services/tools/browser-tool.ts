import { PlaywrightBrowser } from '../../../infrastructure/browser/playwright-browser';
import { BaseTool, toolSchema } from './base-tool';

export class BrowserTool extends BaseTool {
  readonly name = 'browser';

  constructor(private readonly browser: PlaywrightBrowser) {
    super();
    this.registerTool(
      toolSchema('browser_view', '查看当前浏览器页面内容，用于确认已打开的页面的最新状态', {}, []),
      () => this.browser.viewPage(),
    );
    this.registerTool(
      toolSchema(
        'browser_navigate',
        '导航到指定URL',
        { url: { type: 'string', description: '访问的完整URL，例如：https://www.baidu.com' } },
        ['url'],
      ),
      (args) => this.browser.navigate(String(args.url)),
    );
    this.registerTool(
      toolSchema(
        'browser_restart',
        '重启浏览器',
        { url: { type: 'string', description: '访问的完整URL，例如：https://www.baidu.com' } },
        ['url'],
      ),
      (args) => this.browser.restart(String(args.url)),
    );
    this.registerTool(
      toolSchema(
        'browser_click',
        '点击页面元素',
        {
          index: { type: 'integer', description: '元素的索引' },
          coordinate_x: { type: 'number', description: '元素的x坐标' },
          coordinate_y: { type: 'number', description: '元素的y坐标' },
        },
        [],
      ),
      (args) =>
        this.browser.click(
          args.index != null ? Number(args.index) : undefined,
          args.coordinate_x != null ? Number(args.coordinate_x) : undefined,
          args.coordinate_y != null ? Number(args.coordinate_y) : undefined,
        ),
    );
    this.registerTool(
      toolSchema(
        'browser_input',
        '填充页面元素',
        {
          index: { type: 'integer', description: '元素的索引' },
          coordinate_x: { type: 'number', description: '元素的x坐标' },
          coordinate_y: { type: 'number', description: '元素的y坐标' },
          text: { type: 'string', description: '填充的文本' },
          press_enter: { type: 'boolean', description: '是否按回车键' },
        },
        ['text', 'press_enter'],
      ),
      (args) =>
        this.browser.input(
          String(args.text),
          Boolean(args.press_enter),
          args.index != null ? Number(args.index) : undefined,
          args.coordinate_x != null ? Number(args.coordinate_x) : undefined,
          args.coordinate_y != null ? Number(args.coordinate_y) : undefined,
        ),
    );
    this.registerTool(
      toolSchema(
        'move_mouse',
        '移动鼠标到指定位置',
        {
          coordinate_x: { type: 'number', description: '鼠标的x坐标' },
          coordinate_y: { type: 'number', description: '鼠标的y坐标' },
        },
        [],
      ),
      (args) =>
        this.browser.moveMouse(
          args.coordinate_x != null ? Number(args.coordinate_x) : undefined,
          args.coordinate_y != null ? Number(args.coordinate_y) : undefined,
        ),
    );
    this.registerTool(
      toolSchema('press_key', '按下键盘按键', { key: { type: 'string', description: '按下的按键' } }, ['key']),
      (args) => this.browser.pressKey(String(args.key)),
    );
    this.registerTool(
      toolSchema(
        'select_option',
        '选择下拉框选项',
        {
          index: { type: 'integer', description: '下拉框的索引' },
          option: { type: 'integer', description: '选项的索引' },
        },
        ['index', 'option'],
      ),
      (args) => this.browser.selectOption(Number(args.index), Number(args.option)),
    );
    this.registerTool(
      toolSchema(
        'scroll_up',
        '向上滚动页面',
        { to_up: { type: 'boolean', description: '是否滚动到页面顶部' } },
        [],
      ),
      (args) => this.browser.scrollUp(Boolean(args.to_up)),
    );
    this.registerTool(
      toolSchema(
        'scroll_down',
        '向下滚动页面',
        { to_down: { type: 'boolean', description: '是否滚动到页面底部' } },
        [],
      ),
      (args) => this.browser.scrollDown(Boolean(args.to_down)),
    );
    this.registerTool(
      toolSchema('browser_screenshot', '截取当前浏览器页面', {}, []),
      async () => {
        const buf = await this.browser.screenshot(false);
        return { size: buf.length };
      },
    );
    this.registerTool(
      toolSchema(
        'console_exec',
        '执行JavaScript代码',
        { javascript: { type: 'string', description: '要执行的JavaScript代码' } },
        ['javascript'],
      ),
      (args) => this.browser.consoleExec(String(args.javascript)),
    );
    this.registerTool(
      toolSchema(
        'console_view',
        '查看控制台输出',
        { max_lines: { type: 'integer', description: '最大行数' } },
        [],
      ),
      (args) =>
        this.browser.consoleView(args.max_lines != null ? Number(args.max_lines) : undefined),
    );
  }
}
