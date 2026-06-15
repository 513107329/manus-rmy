/**
 * @openapi
 * /api/status/health:
 *   get:
 *     tags: [System]
 *     summary: 健康检查
 *     description: 检查 PostgreSQL、Redis 等服务是否正常
 *     responses:
 *       200:
 *         description: 所有服务正常
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/HealthStatus'
 *       503:
 *         description: 存在异常服务
 * /api/status/notFound:
 *   get:
 *     tags: [System]
 *     summary: 资源未找到（测试用）
 *     responses:
 *       404:
 *         description: 返回 404 错误
 */

export {};
