# api-node

Manus 后端 API 的 Node.js 版本，替代 Python 版 `api/`，与现有 `ui` 前端 API 契约兼容。

## 技术栈

- Express + TypeScript
- Prisma + PostgreSQL
- Redis（任务流 / SSE 聊天）
- Docker（沙箱管理，对接 sandbox-node）
- OpenAI 兼容 LLM

## 快速开始

### 1. 环境准备

- Node.js >= 20
- PostgreSQL
- Redis
- （可选）Docker，用于动态创建沙箱

### 2. 配置

```bash
cd api-node
cp .env.example .env
# 编辑 DATABASE_URL、REDIS_*、app_config.yaml 中的 LLM 配置
```

本地开发可将 `STORAGE_MODE=local`，文件会存到 `uploads/` 目录。

### 3. 数据库

```bash
npm install
npx prisma migrate deploy
npm run dev      # 端口 8080
```

### 4. 测试

```bash
npm test
npm run lint
```

## 主要 API

| 模块 | 路径 |
|------|------|
| 健康检查 | `GET /api/status/health` |
| 应用配置 | `/api/app-config/*` |
| 文件 | `/api/files/*` |
| 会话 | `/api/sessions/*`（含 SSE 聊天、VNC WebSocket） |

## OpenAPI / Swagger

接口文档由 [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc) 从 JSDoc 注释生成，源码位于 `src/swagger/`：

- `schemas.ts`：公共 Schema（ApiResponse、SessionItem 等）
- `paths/*.ts`：各模块路径定义

启动服务后访问：

- Swagger UI：<http://localhost:8080/api-docs>
- OpenAPI JSON：<http://localhost:8080/api-docs.json>


## 沙箱：动态创建（默认）

`SANDBOX_ADDRESS` **留空**时，chat 会通过 Docker API 为每个会话动态创建 `sandbox-node` 容器（与 Python 版 `api` 一致）。

```env
SANDBOX_ADDRESS=
SANDBOX_IMAGE=sandbox-node-dev
SANDBOX_NAME_PREFIX=sandbox-node-dev
SANDBOX_NETWORK=manus-network-dev
```

**要求：**

1. 本机 Docker 可用（本地 `npm run dev` 需 Docker Desktop）
2. 已构建沙箱镜像：`docker build -t sandbox-node-dev ./sandbox-node`
3. **容器内运行 api-node 时必须挂载 Docker 套接字**（见下方示例）

固定沙箱（调试用）：设置 `SANDBOX_ADDRESS=<容器名或 IP>`，跳过动态创建。

## Docker 联调

```bash
# 1. 构建镜像
docker build -t sandbox-node-dev ./sandbox-node
docker build -t manus-node-dev ./api-node

# 2. 启动 api-node（挂载 docker.sock + 动态创建配置）
docker rm -f manus-api-node-dev
docker run -d --network manus-network-dev --name manus-api-node-dev \
  -p 8080:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --env-file .env.docker.example \
  manus-node-dev
```

本地开发（宿主机直接跑 api-node，`.env` 中 `SANDBOX_NETWORK=manus-network-dev` 可留空，Docker 会分配 bridge IP）：

```bash
cd sandbox-node && npm run dev   # 可选：仅固定沙箱模式需要
cd api-node && npm run dev
```

## 说明

- 原 Python 版 Agent 编排（Planner/ReAct 全量工具链）在 Node 版中实现了**简化可运行版本**：会话聊天会创建沙箱并调用 LLM 返回 SSE 事件。
- 完整 MCP/A2A/Playwright 工具链可按 Python 版逐步移植；当前 REST 接口与数据模型已对齐，便于 UI 联调。
