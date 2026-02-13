import { useState } from 'preact/hooks';
import { route } from 'preact-router';
import { useAuth } from '../lib/auth.jsx';

export function Register() {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register({ username, email, password });
      route('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  const inputClass =
    'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900';

  return (
    <div class="max-w-sm mx-auto px-4 py-16">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Create an account</h1>

      {error && (
        <div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            type="text"
            value={username}
            onInput={(e) => setUsername(e.target.value)}
            class={inputClass}
            minLength={3}
            maxLength={30}
            required
          />
        </div>
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
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Password
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
          Register
        </button>
      </form>

      <p class="text-sm text-gray-500 mt-6 text-center">
        Already have an account?{' '}
        <a href="/login" class="text-gray-900 font-medium">
          Login
        </a>
      </p>
    </div>
  );
}
