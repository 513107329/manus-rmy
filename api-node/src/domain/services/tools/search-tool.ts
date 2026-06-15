import { BingSearchEngine } from '../../../infrastructure/search/bing-search';
import { BaseTool, toolSchema } from './base-tool';

export class SearchTool extends BaseTool {
  readonly name = 'search';

  constructor(private readonly searchEngine: BingSearchEngine) {
    super();
    this.registerTool(
      toolSchema(
        'search_web',
        '全网搜索引擎工具',
        {
          query: { type: 'string', description: '搜索内容' },
          date_range: {
            type: 'string',
            enum: ['all', 'past_hour', 'past_day', 'past_week', 'past_month', 'past_year'],
            description: '时间范围',
          },
        },
        ['query'],
      ),
      (args) =>
        this.searchEngine.invoke(String(args.query), args.date_range as string | undefined),
    );
  }
}
