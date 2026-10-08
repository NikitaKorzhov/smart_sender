import { apiClient } from './client';
import type { Webhook, WebhookList } from '../types/api';

export interface ListWebhooksParams {
  page: number;
  limit: number;
  search: string;
}

export function listWebhooks(params: ListWebhooksParams) {
  return apiClient.get<WebhookList>('/v1/webhooks', { params });
}

export function getWebhook(id: string) {
  return apiClient.get<Webhook>(`/v1/webhooks/${id}`);
}

export interface UpdateWebhookBody {
  name: string;
  url: string;
}

export function updateWebhook(id: string, body: UpdateWebhookBody) {
  return apiClient.put<Webhook>(`/v1/webhooks/${id}`, body);
}
