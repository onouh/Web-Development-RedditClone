import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Moon, Sun } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '', displayName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register({
        username: form.username,
        email: form.email,
        password: form.password,
        displayName: form.displayName || form.username,
      });
      navigate('/', { replace: true });
    } catch (registerError) {
      setError(registerError.details?.[0]?.message || registerError.message);
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

      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:pt-10">
        <div className="w-full max-w-sm">
          <div className="mb-5 text-center">
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="mt-1 text-sm text-muted">Join a community or start your own.</p>
          </div>

          <form onSubmit={submit} className="card space-y-3 p-5">
            {error && (
              <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent" role="alert">
                {error}
              </p>
            )}

            <div>
              <label htmlFor="username" className="mb-1 block text-xs font-semibold text-muted">
                Username
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted">u/</span>
                <input
                  id="username"
                  value={form.username}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      username: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                    }))
                  }
                  autoComplete="username"
                  minLength={3}
                  maxLength={20}
                  required
                  className="input rounded-lg"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-semibold text-muted">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={update('email')}
                autoComplete="email"
                required
                className="input rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="displayName" className="mb-1 block text-xs font-semibold text-muted">
                Display name <span className="font-normal">(optional)</span>
              </label>
              <input
                id="displayName"
                value={form.displayName}
                onChange={update('displayName')}
                maxLength={50}
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
                value={form.password}
                onChange={update('password')}
                autoComplete="new-password"
                minLength={8}
                required
                className="input rounded-lg"
              />
              <p className="mt-1 text-[11px] text-muted">8+ characters, with at least one letter and number.</p>
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1 block text-xs font-semibold text-muted">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                value={form.confirm}
                onChange={update('confirm')}
                autoComplete="new-password"
                required
                className="input rounded-lg"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Creating account…' : 'Sign up'}
            </button>

            <p className="text-center text-xs text-muted">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-accent hover:underline">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
