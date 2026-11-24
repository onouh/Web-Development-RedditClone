import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Moon, Sun } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <header className="flex items-center justify-between px-4 py-3">
        <Logo />
        <button type="button" onClick={toggleTheme} className="icon-btn" aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-16">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold">Log in to Threadit</h1>
            <p className="mt-1 text-sm text-muted">Dive into anything.</p>
          </div>

          <form onSubmit={submit} className="card space-y-3 p-5">
            {error && (
              <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent" role="alert">
                {error}
              </p>
            )}

            <div>
              <label htmlFor="identifier" className="mb-1 block text-xs font-semibold text-muted">
                Username or email
              </label>
              <input
                id="identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                required
                className="input rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-semibold text-muted">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="input rounded-lg"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Logging in…' : 'Log in'}
            </button>

            <p className="text-center text-xs text-muted">
              New to Threadit?{' '}
              <Link to="/register" className="font-semibold text-accent hover:underline">
                Sign up
              </Link>
            </p>
          </form>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
            Demo accounts after running <code className="rounded bg-chip px-1">npm run seed</code>:
            <br />
            <span className="font-medium text-ink/80">alice_dev · bob_builder · carol_codes</span>
            <br />
            password <span className="font-medium text-ink/80">Password123!</span>
          </p>
        </div>
      </main>
    </div>
  );
}
