import { BaseTool, toolSchema } from './base-tool';

export class MessageTool extends BaseTool {
  readonly name = 'message';

  constructor() {
    super();
    this.registerTool(
      toolSchema(
        'message_notify_user',
        '向用户发送通知消息',
        { text: { type: 'string', description: '消息文本' } },
        ['text'],
      ),
      async (args) => String(args.text),
    );

    this.registerTool(
      toolSchema(
        'message_ask_user',
        '向用户提问并等待回复',
        { text: { type: 'string', description: '问题文本' } },
        ['text'],
      ),
      async () => true,
    );
  }
}
