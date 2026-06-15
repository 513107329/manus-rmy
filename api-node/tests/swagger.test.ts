import { createSwaggerSpec } from '../src/swagger/config';

describe('Swagger', () => {
  it('generates OpenAPI spec from JSDoc', () => {
    const spec = createSwaggerSpec();
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toBe('Manus API');
    expect(spec.paths).toBeDefined();
    expect(spec.paths['/api/status/health']).toBeDefined();
    expect(spec.paths['/api/sessions']).toBeDefined();
    expect(spec.components?.schemas?.ApiResponse).toBeDefined();
  });
});
