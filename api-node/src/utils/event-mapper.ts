import { Event } from '../domain/models';

export interface SSEEvent {
  event: string;
  data: Record<string, unknown>;
}

export class EventMapper {
  static eventToSseEvent(event: Event): SSEEvent {
    const base = {
      event_id: event.id,
      created_at: event.created_at ?? Math.floor(Date.now() / 1000),
    };

    switch (event.type) {
      case 'message':
        return {
          event: 'message',
          data: {
            ...base,
            role: (event as { role?: string }).role ?? 'assistant',
            message: (event as { message?: string }).message ?? '',
            attachments: (event as { attachments?: unknown[] }).attachments ?? [],
          },
        };
      case 'error':
        return {
          event: 'error',
          data: { ...base, error: (event as { error?: string }).error ?? '' },
        };
      case 'done':
        return { event: 'done', data: base };
      case 'wait':
        return { event: 'wait', data: base };
      case 'plan':
        return {
          event: 'plan',
          data: { ...base, ...(event as Record<string, unknown>) },
        };
      case 'step':
        return {
          event: 'step',
          data: { ...base, ...(event as Record<string, unknown>) },
        };
      case 'title':
        return {
          event: 'title',
          data: { ...base, title: (event as { title?: string }).title ?? '' },
        };
      case 'tool':
        return {
          event: 'tool',
          data: { ...base, ...(event as Record<string, unknown>) },
        };
      default:
        return { event: event.type || 'unknown', data: { ...base, ...event } };
    }
  }

  static eventsToSseEvents(events: Event[]): SSEEvent[] {
    return events.map((e) => EventMapper.eventToSseEvent(e));
  }
}

export function formatSse(event: SSEEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}
