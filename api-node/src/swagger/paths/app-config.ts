/**
 * @openapi
 * /api/app-config/llm-config:
 *   get:
 *     tags: [应用配置]
 *     summary: 获取 LLM 配置
 *     description: 返回模型名称、地址等（不含 api_key）
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
 *                       $ref: '#/components/schemas/LLMConfig'
 *   post:
 *     tags: [应用配置]
 *     summary: 更新 LLM 配置
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LLMConfig'
 *     responses:
 *       200:
 *         description: 更新成功
 * /api/app-config/agent-config:
 *   get:
 *     tags: [应用配置]
 *     summary: 获取 Agent 配置
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
 *                       $ref: '#/components/schemas/AgentConfig'
 *   post:
 *     tags: [应用配置]
 *     summary: 更新 Agent 配置
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AgentConfig'
 *     responses:
 *       200:
 *         description: 更新成功
 * /api/app-config/app-config:
 *   get:
 *     tags: [应用配置]
 *     summary: 获取完整应用配置
 *     responses:
 *       200:
 *         description: 成功（LLM 不含 api_key）
 * /api/app-config/mcp-servers:
 *   get:
 *     tags: [应用配置]
 *     summary: 获取 MCP 服务器列表
 *     responses:
 *       200:
 *         description: 成功
 *   post:
 *     tags: [应用配置]
 *     summary: 新增 MCP 服务配置
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/McpConfig'
 *     responses:
 *       200:
 *         description: 创建成功
 * /api/app-config/mcp-servers/{serverName}/enable:
 *   post:
 *     tags: [应用配置]
 *     summary: 更新 MCP 服务启用状态
 *     parameters:
 *       - in: path
 *         name: serverName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enable:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 更新成功
 * /api/app-config/mcp-servers/{serverName}/delete:
 *   delete:
 *     tags: [应用配置]
 *     summary: 删除 MCP 服务
 *     parameters:
 *       - in: path
 *         name: serverName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 * /api/app-config/a2a-servers:
 *   get:
 *     tags: [应用配置]
 *     summary: 获取 A2A 服务器列表
 *     responses:
 *       200:
 *         description: 成功
 *   post:
 *     tags: [应用配置]
 *     summary: 新增 A2A 服务
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [base_url]
 *             properties:
 *               base_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: 创建成功
 * /api/app-config/a2a-servers/{id}/enable:
 *   post:
 *     tags: [应用配置]
 *     summary: 更新 A2A 服务启用状态
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enable:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 更新成功
 * /api/app-config/a2a-servers/{id}/delete:
 *   delete:
 *     tags: [应用配置]
 *     summary: 删除 A2A 服务
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 */

export {};
