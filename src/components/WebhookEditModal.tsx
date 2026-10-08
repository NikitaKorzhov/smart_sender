import { useWebhookEditForm } from './useWebhookEditForm';
import type { Webhook } from '../types/api';
import './WebhookEditModal.css';

interface Props {
  webhookId: string;
  onSaved: (webhook: Webhook) => void;
  onClose: () => void;
}

export const WebhookEditModal = ({ webhookId, onSaved, onClose }: Props) => {
  const { name, setName, url, setUrl, isLoadingWebhook, errors, isSubmitting, generalError, handleSubmit } =
    useWebhookEditForm(webhookId, onSaved);

  if (isLoadingWebhook) {
    return (
      <div className="modal-overlay" role="dialog">
        <div className="modal-card">
          <div className="modal-loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" role="dialog">
      <div className="modal-card">
        <h3>Edit webhook</h3>
        <form onSubmit={handleSubmit}>
          {generalError && <div className="modal-general-error">{generalError}</div>}

          <label className="modal-field">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          {errors.name?.map((msg, i) => (
            <div key={i} className="field-error">{msg}</div>
          ))}

          <label className="modal-field">
            URL
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhook" />
          </label>
          {errors.url?.map((msg, i) => (
            <div key={i} className="field-error">{msg}</div>
          ))}

          <div className="modal-actions">
            <button type="button" className="modal-button-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="modal-button-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
