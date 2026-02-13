import { useAuth } from '../lib/auth.jsx';
import { route } from 'preact-router';

export function Layout({ children }) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    route('/');
  };

  return (
    <div class="min-h-screen bg-gray-50">
      <nav class="bg-white border-b border-gray-200">
        <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" class="font-bold text-lg text-gray-900">
            FastForward
          </a>
          <div class="flex items-center gap-4">
            {user ? (
              <>
                <a
                  href="/dashboard"
                  class="text-sm text-gray-600 hover:text-gray-900"
                >
                  Dashboard
                </a>
                <button
                  onClick={handleLogout}
                  class="text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <a
                  href="/login"
                  class="text-sm text-gray-600 hover:text-gray-900"
                >
                  Login
                </a>
                <a
                  href="/register"
                  class="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-gray-800"
                >
                  Register
                </a>
              </>
            )}
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
