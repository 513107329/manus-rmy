export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | Record<string, never>;
}

export function success<T>(message = 'success', data?: T): ApiResponse<T> {
  return {
    code: 200,
    message,
    data: (data ?? {}) as T,
  };
}

export function fail<T>(code = 500, message = 'fail', data?: T): ApiResponse<T> {
  return {
    code,
    message,
    data: (data ?? {}) as T,
  };
}
