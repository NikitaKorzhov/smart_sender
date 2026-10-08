import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useWebhookList } from './useWebhookList';
import { WebhookEditModal } from '../components/WebhookEditModal';
import './WebhooksPage.css';

export const WebhooksPage: React.FC = () => {
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

  return (
    <div className="webhooks-page">
      <div className="webhooks-container">
        <div className="webhooks-header">
          <h2>Webhooks</h2>
          <button className="logout-button" onClick={() => logout()}>
            Log out
          </button>
        </div>

        <input
          type="text"
          className="search-input"
          placeholder="Search by name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />

        {isLoading && <div className="state-message">Loading...</div>}
        {error && <div className="state-message error">{error}</div>}

        {!isLoading && !error && (
          <>
            {webhooks.length === 0 ? (
              <div className="state-message">No webhooks match your search.</div>
            ) : (
              <div className="webhooks-table-card">
                <table className="webhooks-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>URL</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {webhooks.map((webhook) => (
                      <tr key={webhook.id}>
                        <td>{webhook.name}</td>
                        <td className="webhook-url">{webhook.url}</td>
                        <td>
                          <span className={`status-badge ${webhook.active ? 'active' : 'disabled'}`}>
                            {webhook.active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td>
                          <button className="row-edit-button" onClick={() => setEditingId(webhook.id)}>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {paging && paging.pages.last > 1 && (
              <div className="pagination">
                <button onClick={() => goToPage(page - 1)} disabled={page <= 1}>
                  Previous
                </button>
                <span>
                  Page {paging.pages.current} of {paging.pages.last}
                </span>
                <button onClick={() => goToPage(page + 1)} disabled={page >= paging.pages.last}>
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {editingId && (
          <WebhookEditModal
            webhookId={editingId}
            onClose={() => setEditingId(null)}
            onSaved={(updated) => {
              updateWebhookLocally(updated);
              setEditingId(null);
            }}
          />
        )}
      </div>
    </div>
  );
};
