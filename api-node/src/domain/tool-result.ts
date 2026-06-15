export interface ToolResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export function toolSuccess<T>(data?: T, message?: string): ToolResult<T> {
  return { success: true, data, message };
}

export function toolFailure(message: string, error?: string): ToolResult {
  return { success: false, message, error: error ?? message };
}
