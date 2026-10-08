import { useState, useEffect } from 'react';
import type React from 'react';
import { getWebhook, updateWebhook } from '../api/webhooks';
import { getApiErrorStatus, getApiErrorPayload } from '../api/errors';
import type { Webhook, ValidationErrors } from '../types/api';

export function useWebhookEditForm(webhookId: string, onSaved: (webhook: Webhook) => void) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [isLoadingWebhook, setIsLoadingWebhook] = useState(true);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    getWebhook(webhookId)
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
      const response = await updateWebhook(webhookId, { name, url });
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

  return { name, setName, url, setUrl, isLoadingWebhook, errors, isSubmitting, generalError, handleSubmit };
}
