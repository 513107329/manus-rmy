import request from 'supertest';
import { createApp } from '../src/main';
import { statusService } from '../src/services/status.service';

jest.mock('../src/services/status.service', () => ({
  statusService: {
    checkAll: jest.fn().mockResolvedValue([
      { status: 'ok', service: 'postgres', detail: 'connected' },
      { status: 'ok', service: 'redis', detail: 'connected' },
    ]),
  },
}));

describe('API routes', () => {
  const app = createApp();

  it('GET /api/status/health returns ok', async () => {
    const res = await request(app).get('/api/status/health').expect(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(statusService.checkAll).toHaveBeenCalled();
  });

  it('GET /api-docs.json returns OpenAPI spec', async () => {
    const res = await request(app).get('/api-docs.json').expect(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('Manus API');
    expect(res.body.paths['/api/status/health']).toBeDefined();
  });
});
