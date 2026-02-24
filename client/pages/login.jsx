// EXAMPLE PAGE — replace or restyle this login page to fit your app.
// Demonstrates password, email-code, and OAuth auth flows using useAuth().

import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';

export function Login() {
  const { login, sendCode, verifyCode } = useAuth();
  const [providers, setProviders] = useState(null);
  const [tab, setTab] = useState('password');
  const [error, setError] = useState('');

  // Password form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Email code form
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [codeUsername, setCodeUsername] = useState('');

  useEffect(() => {
    api.get('/api/auth/providers').then(setProviders).catch(() => {});

    // Check for OAuth error in URL
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    if (oauthError) {
      setError(oauthError);
    }
  }, []);

  // Set initial tab based on available providers
  useEffect(() => {
    if (providers) {
      if (providers.password) setTab('password');
      else if (providers.emailCode) setTab('email');
    }
  }, [providers]);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login({ username, password });
      route('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await sendCode(email);
      setCodeSent(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await verifyCode(
        email,
        code,
        needsUsername ? codeUsername : undefined,
      );
      route('/dashboard');
    } catch (err) {
      if (err.message.includes('Username is required')) {
        setNeedsUsername(true);
      } else {
        setError(err.message);
      }
    }
  };

  const inputClass =
    'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900';

  const oauthButtonClass =
    'w-full border border-gray-300 rounded-md py-2 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 text-center block';

  const showTabs =
    providers &&
    [providers.password, providers.emailCode].filter(Boolean).length > 1;

  return (
    <div class="max-w-sm mx-auto px-4 py-16">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Login</h1>

      {error && (
        <div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {error}
        </div>
      )}

      {/* OAuth buttons */}
      {providers &&
        (providers.google || providers.github || providers.microsoft) && (
          <div class="space-y-2 mb-6">
            {providers.google && (
              <a href="/api/auth/oauth/google" class={oauthButtonClass}>
                Continue with Google
              </a>
            )}
            {providers.github && (
              <a href="/api/auth/oauth/github" class={oauthButtonClass}>
                Continue with GitHub
              </a>
            )}
            {providers.microsoft && (
              <a href="/api/auth/oauth/microsoft" class={oauthButtonClass}>
                Continue with Microsoft
              </a>
            )}
            {(providers.password || providers.emailCode) && (
              <div class="relative my-4">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-gray-200" />
                </div>
                <div class="relative flex justify-center text-xs">
                  <span class="bg-gray-50 px-2 text-gray-500">or</span>
                </div>
              </div>
            )}
          </div>
        )}

      {/* Tabs */}
      {showTabs && (
        <div class="flex border-b border-gray-200 mb-6">
          {providers.password && (
            <button
              onClick={() => {
                setTab('password');
                setError('');
              }}
              class={`pb-2 px-4 text-sm font-medium cursor-pointer ${
                tab === 'password'
                  ? 'border-b-2 border-gray-900 text-gray-900'
                  : 'text-gray-500'
              }`}
            >
              Password
            </button>
          )}
          {providers.emailCode && (
            <button
              onClick={() => {
                setTab('email');
                setError('');
                setCodeSent(false);
                setNeedsUsername(false);
              }}
              class={`pb-2 px-4 text-sm font-medium cursor-pointer ${
                tab === 'email'
                  ? 'border-b-2 border-gray-900 text-gray-900'
                  : 'text-gray-500'
              }`}
            >
              Email Code
            </button>
          )}
        </div>
      )}

      {/* Password tab */}
      {(!providers || providers.password) && tab === 'password' && (
        <form onSubmit={handlePasswordLogin} class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Username or Email
            </label>
            <input
              type="text"
              value={username}
              onInput={(e) => setUsername(e.target.value)}
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
              required
            />
          </div>
          <button
            type="submit"
            class="w-full bg-gray-900 text-white py-2 rounded-md text-sm font-medium hover:bg-gray-800 cursor-pointer"
          >
            Login
          </button>
          <p class="text-sm text-center">
            <a
              href="/forgot-password"
              class="text-gray-500 hover:text-gray-900"
            >
              Forgot password?
            </a>
          </p>
        </form>
      )}

      {/* Email code tab — enter email */}
      {providers?.emailCode && tab === 'email' && !codeSent && (
        <form onSubmit={handleSendCode} class="space-y-4">
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
            Send Code
          </button>
        </form>
      )}

      {/* Email code tab — verify code */}
      {providers?.emailCode && tab === 'email' && codeSent && (
        <form onSubmit={handleVerifyCode} class="space-y-4">
          <p class="text-sm text-gray-600">
            A 6-digit code was sent to <strong>{email}</strong>.
          </p>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Code
            </label>
            <input
              type="text"
              value={code}
              onInput={(e) => setCode(e.target.value)}
              class={`${inputClass} tracking-widest text-center`}
              maxLength={6}
              required
            />
          </div>
          {needsUsername && (
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Choose a username
              </label>
              <input
                type="text"
                value={codeUsername}
                onInput={(e) => setCodeUsername(e.target.value)}
                class={inputClass}
                minLength={3}
                maxLength={30}
                required
              />
              <p class="text-xs text-gray-500 mt-1">
                No account found — pick a username to create one.
              </p>
            </div>
          )}
          <button
            type="submit"
            class="w-full bg-gray-900 text-white py-2 rounded-md text-sm font-medium hover:bg-gray-800 cursor-pointer"
          >
            Verify
          </button>
        </form>
      )}

      <p class="text-sm text-gray-500 mt-6 text-center">
        Don't have an account?{' '}
        <a href="/register" class="text-gray-900 font-medium">
          Register
        </a>
      </p>
    </div>
  );
}
