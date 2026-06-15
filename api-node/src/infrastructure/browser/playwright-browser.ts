import TurndownService from 'turndown';
import { chromium, Browser, Page, BrowserContext, ElementHandle } from 'playwright';
import { OpenAILLM } from '../llm/openai-llm';
import { toolSuccess, toolFailure } from '../../domain/tool-result';
import { logger } from '../../utils/logger';
import {
  GET_CONSOLE_LOGS_FUNC,
  GET_INTERACTIVE_VISIBLE_CONTENT_FUNC,
  GET_VISIBLE_CONTENT_FUNC,
  INJECT_CONSOLE_FUNC,
  IS_ELEMENT_VISIBLE_FUNC,
  SCROLL_ELEMENT_INTO_VIEW_FUNC,
} from './playwright-browser-func';

type InteractiveElement = {
  index: number;
  tagName: string;
  text: string;
  attributes: string;
  outerHTML: string;
};

/** Playwright 字符串 evaluate 会把入参当表达式执行；箭头函数字符串不调用时返回不可序列化的 Function → undefined */
function evaluatePageScript<T>(page: Page, script: string): Promise<T> {
  return page.evaluate(`(${script})()`);
}

function evaluatePageScriptWithArg<T>(page: Page, script: string, arg: unknown): Promise<T> {
  return page.evaluate(`(${script})`, arg);
}

export class PlaywrightBrowser {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private interactiveCache: InteractiveElement[] = [];
  private readonly turndown = new TurndownService();

  constructor(
    private readonly cdpUrl: string,
    private readonly llm?: OpenAILLM,
  ) {}

  async initialize(): Promise<boolean> {
    let retryInterval = 1000;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        logger.info(`Connecting to CDP: ${this.cdpUrl}`);
        this.browser = await chromium.connectOverCDP(this.cdpUrl);
        await this.ensureLatestPage();
        return true;
      } catch (e) {
        logger.error(`初始化浏览器失败: ${(e as Error).message}`);
        await this.cleanup();
        if (attempt === 4) return false;
        await new Promise((r) => setTimeout(r, retryInterval));
        retryInterval = Math.min(retryInterval * 2, 10_000);
      }
    }
    return false;
  }

  async cleanup(): Promise<void> {
    try {
      if (this.browser) await this.browser.close();
    } catch {
      /* ignore */
    }
    this.browser = null;
    this.page = null;
    this.interactiveCache = [];
  }

  private async ensureLatestPage(): Promise<Page> {
    if (!this.browser) {
      const ok = await this.initialize();
      if (!ok || !this.browser) throw new Error('初始化浏览器失败');
    }
    const contexts = this.browser!.contexts();
    if (contexts.length > 0 && contexts[0].pages().length > 0) {
      this.page = contexts[0].pages()[contexts[0].pages().length - 1];
    } else {
      const ctx: BrowserContext =
        contexts.length > 0 ? contexts[0] : await this.browser!.newContext();
      this.page = await ctx.newPage();
    }
    return this.page!;
  }

  private async waitForPageLoad(timeoutSec = 15): Promise<boolean> {
    const page = await this.ensureLatestPage();
    const deadline = Date.now() + timeoutSec * 1000;
    while (Date.now() < deadline) {
      try {
        const ready = await page.evaluate('document.readyState === "complete"');
        if (ready) return true;
      } catch (e) {
        logger.error(`等待页面加载失败: ${(e as Error).message}`);
        return false;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  }

  private async extractContent(): Promise<string> {
    const page = await this.ensureLatestPage();
    const html = await evaluatePageScript<string>(page, GET_VISIBLE_CONTENT_FUNC);
    let markdown = this.turndown.turndown(String(html));
    const maxLen = Math.min(markdown.length, 50_000);
    markdown = markdown.slice(0, maxLen);

    if (this.llm) {
      try {
        const message = await this.llm.invoke([
          {
            role: 'system',
            content: '你是一个网页内容提取工具，请提取网页中的所有信息，并以markdown格式返回。',
          },
          {
            role: 'user',
            content: `请提取网页中的所有信息，并以markdown格式返回。\n\n${markdown}`,
          },
        ]);
        return message.content ?? markdown;
      } catch (e) {
        logger.warn(`LLM 内容提取失败，使用 Turndown 结果: ${(e as Error).message}`);
      }
    }
    return markdown;
  }

  private async extractInteractiveContent(): Promise<string[]> {
    const page = await this.ensureLatestPage();
    const elements =
      (await evaluatePageScript<InteractiveElement[]>(page, GET_INTERACTIVE_VISIBLE_CONTENT_FUNC)) ?? [];
    this.interactiveCache = elements;
    return elements.map((el) => `${el.index}:${el.outerHTML}`);
  }

  private async getElementByIndex(index: number): Promise<ElementHandle | null> {
    const page = await this.ensureLatestPage();
    if (index < 1 || index > this.interactiveCache.length) {
      return null;
    }
    return page.$(`[data-manus-id="manus-element-${index}"]`);
  }

  async viewPage() {
    try {
      await this.waitForPageLoad();
      const page = await this.ensureLatestPage();
      const interactiveElements = await this.extractInteractiveContent();
      const content = await this.extractContent();
      return toolSuccess({ content, interactive_elements: interactiveElements, url: page.url() }, '提取元素成功');
    } catch (e) {
      return toolFailure(`查看页面失败: ${(e as Error).message}`);
    }
  }

  async navigate(url: string) {
    try {
      const page = await this.ensureLatestPage();
      logger.info(`开始跳转: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      const data = await this.extractInteractiveContent();
      return toolSuccess(data, '页面导航成功');
    } catch (e) {
      return toolFailure(`页面导航失败: ${(e as Error).message}`);
    }
  }

  async restart(url: string) {
    await this.cleanup();
    await this.initialize();
    return this.navigate(url);
  }

  async click(index?: number, coordinateX?: number, coordinateY?: number) {
    try {
      const page = await this.ensureLatestPage();
      if (index != null) {
        const element = await this.getElementByIndex(index);
        if (!element) return toolFailure('元素不存在');
        const visible = await evaluatePageScriptWithArg<boolean>(page, IS_ELEMENT_VISIBLE_FUNC, element);
        if (!visible) {
          await evaluatePageScriptWithArg<void>(page, SCROLL_ELEMENT_INTO_VIEW_FUNC, element);
          await new Promise((r) => setTimeout(r, 1000));
        }
        await element.click({ timeout: 5000 });
      } else if (coordinateX != null && coordinateY != null) {
        await page.mouse.click(coordinateX, coordinateY);
      }
      return toolSuccess({ url: page.url() }, '点击成功');
    } catch (e) {
      return toolFailure(`点击失败: ${(e as Error).message}`);
    }
  }

  async input(
    text: string,
    pressEnter: boolean,
    index?: number,
    coordinateX?: number,
    coordinateY?: number,
  ) {
    try {
      const page = await this.ensureLatestPage();
      if (index != null) {
        const element = await this.getElementByIndex(index);
        if (!element) return toolFailure('元素不存在');
        try {
          await element.fill('');
          await element.type(text);
        } catch {
          await element.click();
          await element.type(text);
        }
      } else if (coordinateX != null && coordinateY != null) {
        await page.mouse.click(coordinateX, coordinateY);
        await page.keyboard.type(text);
      }
      if (pressEnter) await page.keyboard.press('Enter');
      return toolSuccess({ url: page.url() }, '输入成功');
    } catch (e) {
      return toolFailure(`输入失败: ${(e as Error).message}`);
    }
  }

  async moveMouse(coordinateX?: number, coordinateY?: number) {
    try {
      const page = await this.ensureLatestPage();
      if (coordinateX != null && coordinateY != null) {
        await page.mouse.move(coordinateX, coordinateY);
      }
      return toolSuccess({}, '移动成功');
    } catch (e) {
      return toolFailure(`移动失败: ${(e as Error).message}`);
    }
  }

  async pressKey(key: string) {
    try {
      const page = await this.ensureLatestPage();
      await page.keyboard.press(key);
      return toolSuccess({}, '按键成功');
    } catch (e) {
      return toolFailure(`按键失败: ${(e as Error).message}`);
    }
  }

  async selectOption(index: number, option: number) {
    try {
      const element = await this.getElementByIndex(index);
      if (!element) return toolFailure('元素不存在');
      await element.selectOption({ index: option });
      return toolSuccess({}, '选择成功');
    } catch (e) {
      return toolFailure(`选择失败: ${(e as Error).message}`);
    }
  }

  async scrollUp(toUp?: boolean) {
    const page = await this.ensureLatestPage();
    await evaluatePageScriptWithArg<void>(page, '(toUp) => { if (toUp) window.scrollTo(0, 0); else window.scrollBy(0, -window.innerHeight); }', Boolean(toUp));
    return toolSuccess({}, '滚动成功');
  }

  async scrollDown(toDown?: boolean) {
    const page = await this.ensureLatestPage();
    await evaluatePageScriptWithArg<void>(
      page,
      '(toDown) => { if (toDown) window.scrollTo(0, document.body.scrollHeight); else window.scrollBy(0, window.innerHeight); }',
      Boolean(toDown),
    );
    return toolSuccess({}, '滚动成功');
  }

  async consoleExec(javascript: string) {
    try {
      const page = await this.ensureLatestPage();
      await evaluatePageScript<void>(page, INJECT_CONSOLE_FUNC).catch(() => undefined);
      const result = await page.evaluate(javascript);
      return toolSuccess(result, '执行成功');
    } catch (e) {
      return toolFailure(`执行失败: ${(e as Error).message}`);
    }
  }

  async consoleView(maxLines?: number) {
    try {
      const page = await this.ensureLatestPage();
      const logs = await evaluatePageScriptWithArg<unknown[]>(page, GET_CONSOLE_LOGS_FUNC, maxLines ?? null);
      return toolSuccess(logs, '获取成功');
    } catch (e) {
      return toolFailure(`获取控制台失败: ${(e as Error).message}`);
    }
  }

  async screenshot(fullPage = false): Promise<Buffer> {
    const page = await this.ensureLatestPage();
    return page.screenshot({ fullPage, type: 'png' });
  }
}
