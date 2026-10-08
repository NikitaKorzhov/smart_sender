import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getApiErrorStatus } from '../api/errors';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      // Return to where RequireAuth redirected from (keeps page/search), default to /webhooks.
      const redirectTo = (location.state as { from?: string } | null)?.from || '/webhooks';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (getApiErrorStatus(err) === 422) {
        setError('Invalid email or password.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Welcome back</h2>
        <p className="login-subtitle">Sign in to manage your webhooks</p>
        <form onSubmit={handleLogin} className="login-form">
          <label className="login-field">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label className="login-field">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-submit" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};
