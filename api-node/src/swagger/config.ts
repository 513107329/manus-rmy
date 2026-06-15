import path from 'path';
import { Express } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { getSettings } from '../config';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Manus API',
    version: '0.1.0',
    description: 'Manus 项目后端服务（Node.js）OpenAPI 文档，由 swagger-jsdoc 从 JSDoc 注释生成',
  },
  servers: [
    {
      url: 'http://localhost:8080',
      description: '本地开发',
    },
  ],
  tags: [
    { name: 'System', description: '系统相关接口' },
    { name: '应用配置', description: 'LLM / Agent / MCP / A2A 配置' },
    { name: '文件处理', description: '文件上传与下载' },
    { name: 'Session模块', description: '会话与 Agent 聊天' },
  ],
};

const apiGlobs = [
  path.join(__dirname, 'schemas.ts'),
  path.join(__dirname, 'schemas.js'),
  path.join(__dirname, 'paths', '*.ts'),
  path.join(__dirname, 'paths', '*.js'),
].map((p) => p.split(path.sep).join('/'));

export interface OpenAPISpec {
  openapi: string;
  info: { title: string; version?: string; description?: string };
  servers?: { url: string; description?: string }[];
  paths: Record<string, unknown>;
  components?: { schemas?: Record<string, unknown> };
}

export function createSwaggerSpec(): OpenAPISpec {
  return swaggerJsdoc({
    definition: swaggerDefinition,
    apis: apiGlobs,
  }) as OpenAPISpec;
}

export function setupSwagger(app: Express): void {
  const spec = createSwaggerSpec();
  const { port } = getSettings();

  if (Array.isArray(spec.servers) && spec.servers.length > 0) {
    spec.servers[0].url = `http://localhost:${port}`;
  }

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec, {
    customSiteTitle: 'Manus API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
    },
  }));

  app.get('/api-docs.json', (_req, res) => {
    res.json(spec);
  });
}
