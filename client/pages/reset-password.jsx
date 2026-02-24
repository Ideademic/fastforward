// EXAMPLE PAGE — replace or restyle this page to fit your app.
// Demonstrates the password reset flow (token from URL query param).

import { useState } from 'preact/hooks';
import { api } from '../lib/api.js';

export function ResetPassword() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const inputClass =
    'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!token) {
    return (
      <div class="max-w-sm mx-auto px-4 py-16">
        <h1 class="text-2xl font-bold text-gray-900 mb-4">Invalid link</h1>
        <p class="text-gray-600 text-sm">
          This password reset link is invalid or has expired.
        </p>
        <p class="text-sm text-gray-500 mt-6 text-center">
          <a href="/forgot-password" class="text-gray-900 font-medium">
            Request a new link
          </a>
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div class="max-w-sm mx-auto px-4 py-16">
        <h1 class="text-2xl font-bold text-gray-900 mb-4">
          Password reset successful
        </h1>
        <p class="text-gray-600 text-sm">
          Your password has been updated. You can now log in with your new
          password.
        </p>
        <p class="text-sm mt-6 text-center">
          <a
            href="/login"
            class="inline-block bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
          >
            Go to Login
          </a>
        </p>
      </div>
    );
  }

  return (
    <div class="max-w-sm mx-auto px-4 py-16">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Set new password</h1>
      <p class="text-gray-600 text-sm mb-6">Enter your new password below.</p>

      {error && (
        <div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <input
            type="password"
            value={password}
            onInput={(e) => setPassword(e.target.value)}
            class={inputClass}
            minLength={8}
            required
          />
          <p class="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
        </div>
        <button
          type="submit"
          class="w-full bg-gray-900 text-white py-2 rounded-md text-sm font-medium hover:bg-gray-800 cursor-pointer"
        >
          Reset Password
        </button>
      </form>
    </div>
  );
}
