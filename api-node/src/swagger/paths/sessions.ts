/**
 * @openapi
 * /api/sessions:
 *   post:
 *     tags: [Session模块]
 *     summary: 创建会话
 *     responses:
 *       200:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         session_id:
 *                           type: string
 *   get:
 *     tags: [Session模块]
 *     summary: 获取会话列表
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         sessions:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/SessionItem'
 * /api/sessions/stream:
 *   get:
 *     tags: [Session模块]
 *     summary: 流式获取会话列表
 *     description: Server-Sent Events，每 5 秒推送一次 sessions 事件
 *     responses:
 *       200:
 *         description: SSE 流
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 * /api/sessions/{sessionId}:
 *   get:
 *     tags: [Session模块]
 *     summary: 获取会话详情
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/SessionItem'
 * /api/sessions/{sessionId}/messages:
 *   get:
 *     tags: [Session模块]
 *     summary: 获取会话消息
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功，包含 events 列表
 * /api/sessions/{sessionId}/chat:
 *   post:
 *     tags: [Session模块]
 *     summary: 会话聊天
 *     description: Server-Sent Events 流式返回 Agent 事件
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatRequest'
 *     responses:
 *       200:
 *         description: SSE 事件流
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 * /api/sessions/{sessionId}/stop:
 *   post:
 *     tags: [Session模块]
 *     summary: 停止会话
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 停止成功
 * /api/sessions/{sessionId}/clear-unread-session-message:
 *   post:
 *     tags: [Session模块]
 *     summary: 清空未读消息
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 * /api/sessions/{sessionId}/delete:
 *   post:
 *     tags: [Session模块]
 *     summary: 删除会话
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 * /api/sessions/{sessionId}/update-title:
 *   post:
 *     tags: [Session模块]
 *     summary: 更新会话标题
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: title
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 更新成功
 * /api/sessions/{sessionId}/files:
 *   get:
 *     tags: [Session模块]
 *     summary: 获取会话文件列表
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 * /api/sessions/{sessionId}/file:
 *   post:
 *     tags: [Session模块]
 *     summary: 查看会话沙箱中的文件
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FileReadRequest'
 *     responses:
 *       200:
 *         description: 文件内容
 * /api/sessions/{sessionId}/shell:
 *   post:
 *     tags: [Session模块]
 *     summary: 获取会话沙箱 shell 输出
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShellReadRequest'
 *     responses:
 *       200:
 *         description: shell 输出
 */

export {};
