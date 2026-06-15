# sandbox-node

Manus 沙箱服务的 Node.js 版本，API 与 Python 版 `sandbox/` 兼容。

## 快速开始

```bash
cd sandbox-node
cp .env.example .env
npm install
npm run dev      # 开发模式，端口 8000
npm test         # 运行测试
npm run build && npm start
```

## API 路由

- `/api/file/*` - 文件读写、搜索、上传下载
- `/api/shell/*` - Shell 命令执行
- `/api/supervisor/*` - Supervisor 进程与超时管理

## Docker

容器内由 supervisord 统一管理以下进程（与 Python 版 `sandbox/` 一致）：

| 进程 | 端口 | 说明 |
|------|------|------|
| app | 8000 | Node.js REST API |
| chrome + socat | 9222 | Chrome CDP 调试 |
| x11vnc | 5900 | VNC |
| websockify | 5901 | WebSocket VNC（供 api-node 转发） |
| xvfb | — | 虚拟显示器 |

```bash
docker build -t manus-sandbox-node .
docker run -p 8000:8000 -p 9222:9222 -p 5900:5900 -p 5901:5901 manus-sandbox-node
```

## 与 api-node 的关系

`api-node` 通过 HTTP 调用本服务的 `/api/file`、`/api/shell` 等接口，与 Python 版 `api` 行为一致。
