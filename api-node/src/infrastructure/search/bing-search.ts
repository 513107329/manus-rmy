import axios from 'axios';
import { toolSuccess, toolFailure } from '../../domain/tool-result';

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export class BingSearchEngine {
  private readonly baseUrl = 'https://www.bing.com/search';
  private readonly headers = {
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    'accept-language': 'en-US,en;q=0.9',
  };

  async invoke(query: string, dateRange?: string) {
    try {
      const params: Record<string, string> = { q: query };
      if (dateRange && dateRange !== 'all') {
        const map: Record<string, string> = {
          past_day: 'ex1:"ez1"',
          past_week: 'ex1:"ez2"',
          past_month: 'ex1:"ez3"',
        };
        if (map[dateRange]) params.filters = map[dateRange];
      }

      const res = await axios.get(this.baseUrl, {
        params,
        headers: this.headers,
        timeout: 60_000,
      });

      const html = String(res.data);
      const results: SearchResultItem[] = [];
      const itemRegex = /<li class="b_algo"[\s\S]*?<\/li>/g;
      const items = html.match(itemRegex) ?? [];

      for (const item of items.slice(0, 10)) {
        const titleMatch = item.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
        const snippetMatch = item.match(/<p[^>]*>([\s\S]*?)<\/p>/);
        if (!titleMatch) continue;
        results.push({
          title: titleMatch[2].replace(/<[^>]+>/g, '').trim(),
          url: titleMatch[1],
          snippet: snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '',
        });
      }

      return toolSuccess({ results, query });
    } catch (e) {
      return toolFailure(`搜索失败: ${(e as Error).message}`);
    }
  }
}

export const bingSearchEngine = new BingSearchEngine();
