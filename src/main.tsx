import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { primeCsrfToken } from './api/client';

async function enableMocking() {
  if (import.meta.env.PROD) return;
  const { worker } = await import('./mocks/browser');
  return worker.start({ onUnhandledRequest: 'bypass' });
}

// GET /csrf runs before any other request, not just lazily before the first POST/PUT.
enableMocking()
  .then(() => primeCsrfToken())
  .then(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
