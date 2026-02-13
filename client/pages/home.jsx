import { useAuth } from '../lib/auth.jsx';

export function Home() {
  const { user } = useAuth();

  return (
    <div class="max-w-3xl mx-auto px-4 py-20 text-center">
      <h1 class="text-5xl font-bold text-gray-900 mb-4">FastForward</h1>
      <p class="text-lg text-gray-600 mb-8">
        A ready-to-go boilerplate with Preact, Hapi.js, Postgres, and built-in
        auth.
      </p>
      {user ? (
        <a
          href="/dashboard"
          class="inline-block bg-gray-900 text-white px-6 py-2.5 rounded-md hover:bg-gray-800"
        >
          Go to Dashboard
        </a>
      ) : (
        <div class="flex gap-3 justify-center">
          <a
            href="/register"
            class="bg-gray-900 text-white px-6 py-2.5 rounded-md hover:bg-gray-800"
          >
            Get Started
          </a>
          <a
            href="/login"
            class="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-md hover:bg-gray-100"
          >
            Login
          </a>
        </div>
      )}
    </div>
  );
}
