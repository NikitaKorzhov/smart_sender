import axios from 'axios';
import type { ApiErrorBody } from '../types/api';

export function getApiErrorStatus(err: unknown): number | undefined {
  return axios.isAxiosError(err) ? err.response?.status : undefined;
}

export function getApiErrorPayload(err: unknown): Record<string, string[]> | null {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    return err.response?.data?.error?.payload ?? null;
  }
  return null;
}
