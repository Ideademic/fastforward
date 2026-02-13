import Router from 'preact-router';
import { AuthProvider } from './lib/auth.jsx';
import { Layout } from './components/layout.jsx';
import { Home } from './pages/home.jsx';
import { Login } from './pages/login.jsx';
import { Register } from './pages/register.jsx';
import { Dashboard } from './pages/dashboard.jsx';

export function App() {
  return (
    <AuthProvider>
      <Layout>
        <Router>
          <Home path="/" />
          <Login path="/login" />
          <Register path="/register" />
          <Dashboard path="/dashboard" />
        </Router>
      </Layout>
    </AuthProvider>
  );
}
