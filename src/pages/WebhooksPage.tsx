import { useWebhooksPage } from './useWebhooksPage';
import { WebhookEditModal } from '../components/WebhookEditModal';
import './WebhooksPage.css';

export const WebhooksPage = () => {
  const {
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
  } = useWebhooksPage();

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
          aria-label="Search by name"
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
                          <button className="row-edit-button" onClick={() => openEdit(webhook.id)}>
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

        {editingId && <WebhookEditModal webhookId={editingId} onClose={closeEdit} onSaved={handleSaved} />}
      </div>
    </div>
  );
};
