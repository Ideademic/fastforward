// EXAMPLE PAGE — replace this with your own authenticated page.
// Demonstrates a protected route that redirects to /login when not authenticated.

import { useAuth } from '../lib/auth.jsx';
import { route } from 'preact-router';

export function Dashboard() {
  const { user, loading } = useAuth();

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
          <div class="flex">
            <dt class="w-24 text-gray-500">Email</dt>
            <dd class="text-gray-900">{user.email}</dd>
          </div>
          <div class="flex">
            <dt class="w-24 text-gray-500">Joined</dt>
            <dd class="text-gray-900">
              {new Date(user.created_at).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
