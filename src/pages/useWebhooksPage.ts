import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useWebhookList } from './useWebhookList';
import type { Webhook } from '../types/api';

export function useWebhooksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { logout } = useAuth();

  // Derived straight from the URL, no duplicate useState. Invalid `page` falls back to 1.
  const rawPage = Number(searchParams.get('page'));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const search = searchParams.get('search') || '';

  // Local state for the controlled input, so typing doesn't write to the URL on every key.
  const [searchInput, setSearchInput] = useState(search);
  // Resync on external URL changes (back/forward) during render, not in an effect.
  const [syncedSearch, setSyncedSearch] = useState(search);
  if (search !== syncedSearch) {
    setSyncedSearch(search);
    setSearchInput(search);
  }

  const [editingId, setEditingId] = useState<string | null>(null);

  // Debounced URL write, resets to page 1 on an actual search change.
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
