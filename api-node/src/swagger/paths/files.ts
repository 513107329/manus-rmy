/**
 * @openapi
 * /api/files/upload-file:
 *   post:
 *     tags: [文件处理]
 *     summary: 上传文件
 *     description: 将文件上传到本地存储或 TOS
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: 上传成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/FileRecord'
 * /api/files/{fileId}:
 *   get:
 *     tags: [文件处理]
 *     summary: 获取文件信息
 *     parameters:
 *       - in: path
 *         name: fileId
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
 *                       $ref: '#/components/schemas/FileRecord'
 * /api/files/{fileId}/download:
 *   get:
 *     tags: [文件处理]
 *     summary: 下载文件
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 文件二进制流
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 */

export {};
