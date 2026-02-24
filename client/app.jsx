// EXAMPLE APP — replace the routes and layout below with your own.
// AuthProvider is the only part you should keep as-is (see client/lib/auth.jsx).

import Router from 'preact-router';
import { useState } from 'preact/hooks';
import { AuthProvider } from './lib/auth.jsx';
import { Layout } from './components/layout.jsx';
import { Home } from './pages/home.jsx';
import { Login } from './pages/login.jsx';
import { Register } from './pages/register.jsx';
import { Dashboard } from './pages/dashboard.jsx';
import { ForgotPassword } from './pages/forgot-password.jsx';
import { ResetPassword } from './pages/reset-password.jsx';

export function App() {
  const [url, setUrl] = useState('/');

  return (
    <AuthProvider>
      <Layout hideNav={url === '/'}>
        <Router onChange={(e) => setUrl(e.url)}>
          <Home path="/" />
          <Login path="/login" />
          <Register path="/register" />
          <Dashboard path="/dashboard" />
          <ForgotPassword path="/forgot-password" />
          <ResetPassword path="/reset-password" />
        </Router>
      </Layout>
    </AuthProvider>
  );
}
