// EXAMPLE PAGE — replace this with your own authenticated page.
// Demonstrates a protected route that redirects to /login when not authenticated.

import { useState } from 'preact/hooks';
import { useAuth } from '../lib/auth.jsx';
import { route } from 'preact-router';
import { api } from '../lib/api.js';

export function Dashboard() {
  const { user, loading } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (loading) {
    return (
      <div class="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (!user) {
    route('/login');
    return null;
  }

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete('/api/auth/account');
      route('/');
      window.location.reload();
    } catch (err) {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div class="max-w-3xl mx-auto px-4 py-16">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p class="text-gray-600 mb-8">
        Welcome back, <strong>{user.username}</strong>.
      </p>

      <div class="bg-white border border-gray-200 rounded-lg p-6">
        <h2 class="font-medium text-gray-900 mb-4">Your Profile</h2>
        <dl class="space-y-3 text-sm">
          <div class="flex">
            <dt class="w-24 text-gray-500">Username</dt>
            <dd class="text-gray-900">{user.username}</dd>
          </div>
          {user.display_name && (
            <div class="flex">
              <dt class="w-24 text-gray-500">Name</dt>
              <dd class="text-gray-900">{user.display_name}</dd>
            </div>
          )}
          {user.email && (
            <div class="flex">
              <dt class="w-24 text-gray-500">Email</dt>
              <dd class="text-gray-900">{user.email}</dd>
            </div>
          )}
          <div class="flex">
            <dt class="w-24 text-gray-500">Joined</dt>
            <dd class="text-gray-900">
              {new Date(user.created_at).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>

      {/* Delete Account */}
      <div class="mt-8 border border-red-200 rounded-lg p-6">
        <h2 class="font-medium text-red-900 mb-2">Danger Zone</h2>
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            class="text-sm text-red-600 hover:text-red-800 font-medium cursor-pointer"
          >
            Delete Account
          </button>
        ) : (
          <div>
            <p class="text-sm text-gray-600 mb-3">
              This will permanently delete your account and all associated data.
              This action cannot be undone.
            </p>
            <div class="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                class="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, delete my account'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                class="text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
