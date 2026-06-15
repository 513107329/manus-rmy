import { EventMapper } from '../src/utils/event-mapper';
import { AppConfigService } from '../src/services/app-config.service';

describe('EventMapper', () => {
  it('maps message events to SSE', () => {
    const sse = EventMapper.eventToSseEvent({
      id: '1',
      type: 'message',
      role: 'assistant',
      message: 'hello',
      created_at: 1710000000,
    });
    expect(sse.event).toBe('message');
    expect(sse.data.message).toBe('hello');
  });

  it('maps done events to SSE', () => {
    const sse = EventMapper.eventToSseEvent({ id: '2', type: 'done', created_at: 1710000001 });
    expect(sse.event).toBe('done');
  });
});

describe('AppConfigService', () => {
  it('loads yaml config', () => {
    const service = new AppConfigService();
    const config = service.getAppConfig();
    expect(config.llm_config.model_name).toBe('deepseek-chat');
    expect(config.agent_config.max_iterations).toBeGreaterThan(0);
  });
});
