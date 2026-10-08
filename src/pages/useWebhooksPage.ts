import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useWebhookList } from './useWebhookList';
import type { Webhook } from '../types/api';

export function useWebhooksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { logout } = useAuth();

  // Derived straight from the URL — no duplicate useState.
  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';

  // Local state only for the controlled input, so we don't write to the URL on every keystroke.
  const [searchInput, setSearchInput] = useState(search);
  // Adjust state during render instead of in an effect when `search` changes externally
  // (browser back/forward) — avoids an extra render-after-commit round trip.
  const [syncedSearch, setSyncedSearch] = useState(search);
  if (search !== syncedSearch) {
    setSyncedSearch(search);
    setSearchInput(search);
  }

  const [editingId, setEditingId] = useState<string | null>(null);

  // Debounced URL write, resetting to page 1 on an actual search change.
  // `search` is a dependency too: if the URL changes externally (browser back/forward)
  // while this is pending, the stale timer is cleared along with the old effect.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput === search) return;
      const next = new URLSearchParams();
      next.set('page', '1');
      if (searchInput) next.set('search', searchInput);
      setSearchParams(next);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const { webhooks, paging, isLoading, error, updateWebhookLocally } = useWebhookList(page, search);

  const goToPage = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(newPage));
    setSearchParams(next);
  };

  const openEdit = (id: string) => setEditingId(id);
  const closeEdit = () => setEditingId(null);
  const handleSaved = (updated: Webhook) => {
    updateWebhookLocally(updated);
    setEditingId(null);
  };

  return {
    logout,
    page,
    searchInput,
    setSearchInput,
    webhooks,
    paging,
    isLoading,
    error,
    editingId,
    openEdit,
    closeEdit,
    handleSaved,
    goToPage,
  };
}
