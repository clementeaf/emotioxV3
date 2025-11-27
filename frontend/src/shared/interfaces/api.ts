export interface APIResponse<T> {
  data: T | null;
  error?: string;
  message?: string;
  status: number;
} 