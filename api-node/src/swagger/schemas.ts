/**
 * @openapi
 * components:
 *   schemas:
 *     ApiResponse:
 *       type: object
 *       properties:
 *         code:
 *           type: integer
 *           example: 200
 *         message:
 *           type: string
 *           example: success
 *         data:
 *           type: object
 *           additionalProperties: true
 *     HealthStatus:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [ok, error]
 *         service:
 *           type: string
 *         detail:
 *           type: string
 *     LLMConfig:
 *       type: object
 *       properties:
 *         base_url:
 *           type: string
 *           example: https://api.deepseek.com/
 *         model_name:
 *           type: string
 *           example: deepseek-chat
 *         tempature:
 *           type: number
 *           example: 1.0
 *         max_tokens:
 *           type: integer
 *           example: 8192
 *     AgentConfig:
 *       type: object
 *       properties:
 *         max_iterations:
 *           type: integer
 *         max_retries:
 *           type: integer
 *         max_search_results:
 *           type: integer
 *     McpServerConfig:
 *       type: object
 *       properties:
 *         transport:
 *           type: string
 *         enabled:
 *           type: boolean
 *         description:
 *           type: string
 *         url:
 *           type: string
 *         command:
 *           type: string
 *         args:
 *           type: array
 *           items:
 *             type: string
 *     McpConfig:
 *       type: object
 *       properties:
 *         mcpServers:
 *           type: object
 *           additionalProperties:
 *             $ref: '#/components/schemas/McpServerConfig'
 *     SessionItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         unread_msg_count:
 *           type: integer
 *         latest_msg:
 *           type: string
 *         latest_message_at:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [pending, running, waiting, completed]
 *     FileRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         filename:
 *           type: string
 *         filepath:
 *           type: string
 *         key:
 *           type: string
 *         extension:
 *           type: string
 *         mime_type:
 *           type: string
 *         size:
 *           type: integer
 *     ChatRequest:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *         event_id:
 *           type: string
 *         timestamp:
 *           type: number
 *     FileReadRequest:
 *       type: object
 *       required: [filepath]
 *       properties:
 *         filepath:
 *           type: string
 *     ShellReadRequest:
 *       type: object
 *       required: [session_id]
 *       properties:
 *         session_id:
 *           type: string
 */

export {};
