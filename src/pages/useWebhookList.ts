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

  // Patch one row locally instead of refetching the whole list. Drop it instead
  // if the edit made it stop matching the active search.
  function updateWebhookLocally(updated: Webhook) {
    const stillMatches = updated.name.toLowerCase().includes(search.toLowerCase());

    setState((prev) => {
      if (stillMatches) {
        return { ...prev, webhooks: prev.webhooks.map((w) => (w.id === updated.id ? updated : w)) };
      }
      if (!prev.paging) {
        return { ...prev, webhooks: prev.webhooks.filter((w) => w.id !== updated.id) };
      }

      const total = prev.paging.results.total - 1;
      const last = Math.max(1, Math.ceil(total / prev.paging.results.limitation));
      return {
        ...prev,
        webhooks: prev.webhooks.filter((w) => w.id !== updated.id),
        paging: { pages: { ...prev.paging.pages, last }, results: { ...prev.paging.results, total } },
      };
    });
  }

  return { ...state, updateWebhookLocally };
}
