import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { getApiErrorStatus, getApiErrorPayload } from '../api/errors';
import type { Webhook, ValidationErrors } from '../types/api';
import './WebhookEditModal.css';

interface Props {
  webhookId: string;
  onSaved: (webhook: Webhook) => void;
  onClose: () => void;
}

export const WebhookEditModal: React.FC<Props> = ({ webhookId, onSaved, onClose }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [isLoadingWebhook, setIsLoadingWebhook] = useState(true);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<Webhook>(`/v1/webhooks/${webhookId}`)
      .then((res) => {
        setName(res.data.name);
        setUrl(res.data.url);
      })
      .catch(() => setGeneralError('Failed to load the webhook.'))
      .finally(() => setIsLoadingWebhook(false));
  }, [webhookId]);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);
    setIsSubmitting(true);

    try {
      const response = await apiClient.put<Webhook>(`/v1/webhooks/${webhookId}`, { name, url });
      onSaved(response.data);
    } catch (err) {
      if (getApiErrorStatus(err) === 422) {
        setErrors(getApiErrorPayload(err) ?? {});
      } else {
        setGeneralError('Something went wrong while saving.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
