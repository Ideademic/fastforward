// EXAMPLE PAGE — replace or restyle this page to fit your app.
// Demonstrates the forgot password flow.

import { useState } from 'preact/hooks';
import { api } from '../lib/api.js';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const inputClass =
    'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (sent) {
    return (
      <div class="max-w-sm mx-auto px-4 py-16">
        <h1 class="text-2xl font-bold text-gray-900 mb-4">Check your email</h1>
        <p class="text-gray-600 text-sm">
          If an account exists for <strong>{email}</strong>, we sent a password
          reset link. Check your inbox and follow the instructions.
        </p>
        <p class="text-sm text-gray-500 mt-6 text-center">
          <a href="/login" class="text-gray-900 font-medium">
            Back to login
          </a>
        </p>
      </div>
    );
  }

  return (
    <div class="max-w-sm mx-auto px-4 py-16">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Forgot password</h1>
      <p class="text-gray-600 text-sm mb-6">
        Enter your email address and we'll send you a link to reset your
        password.
      </p>

      {error && (
        <div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onInput={(e) => setEmail(e.target.value)}
            class={inputClass}
            required
          />
        </div>
        <button
          type="submit"
          class="w-full bg-gray-900 text-white py-2 rounded-md text-sm font-medium hover:bg-gray-800 cursor-pointer"
        >
          Send Reset Link
        </button>
      </form>

      <p class="text-sm text-gray-500 mt-6 text-center">
        <a href="/login" class="text-gray-900 font-medium">
          Back to login
        </a>
      </p>
    </div>
  );
}
