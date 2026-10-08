import { useEffect, useState } from 'react';
import { listWebhooks } from '../api/webhooks';
import type { Webhook, PagingInfo } from '../types/api';

const LIMIT = 10;

interface WebhookListState {
  webhooks: Webhook[];
  paging: PagingInfo | null;
  isLoading: boolean;
  error: string | null;
}

export function useWebhookList(page: number, search: string) {
  const [state, setState] = useState<WebhookListState>({
    webhooks: [],
    paging: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    listWebhooks({ page, limit: LIMIT, search })
      .then((response) => {
        if (cancelled) return;
        setState({ webhooks: response.data.data, paging: response.data.paging, isLoading: false, error: null });
      })
      .catch(() => {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load webhooks. Please try again later.',
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [page, search]);

  // Patch one row locally without refetching the whole list.
  function updateWebhookLocally(updated: Webhook) {
    setState((prev) => ({
      ...prev,
      webhooks: prev.webhooks.map((w) => (w.id === updated.id ? updated : w)),
    }));
  }

  return { ...state, updateWebhookLocally };
}
