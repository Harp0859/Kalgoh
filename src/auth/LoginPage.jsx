import { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUpWithPassword(email, password);
        setNotice('Account created. You can sign in now.');
        setMode('signin');
      } else {
        await signInWithPassword(email, password);
        // auth state listener will update the user and App will re-render
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const isSignup = mode === 'signup';

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-text-primary tracking-tight">Kalgoh</h1>
          <p className="text-sm text-text-muted mt-2">MT5 trading analytics</p>
        </div>

        {/* Auth card */}
        <div className="bg-card rounded-3xl p-8 shadow-xl shadow-black/10">
          <h2 className="text-xl font-semibold text-text-light mb-1">
            {isSignup ? 'Create account' : 'Sign in'}
          </h2>
          <p className="text-sm text-text-card-muted mb-6">
            {isSignup ? 'Use your email and a password to get started' : 'Welcome back'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-xs text-text-card-muted font-medium uppercase tracking-wider">Email</span>
              <div className="mt-2 flex items-center gap-2 bg-card-lighter rounded-xl px-4 py-3">
                <Mail className="w-4 h-4 text-text-card-muted shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  autoComplete="email"
                  className="bg-transparent text-text-light text-sm font-medium w-full focus:outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs text-text-card-muted font-medium uppercase tracking-wider">Password</span>
              <div className="mt-2 flex items-center gap-2 bg-card-lighter rounded-xl px-4 py-3">
                <Lock className="w-4 h-4 text-text-card-muted shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  className="bg-transparent text-text-light text-sm font-medium w-full focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-text-card-muted hover:text-text-light shrink-0"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            {error && <p className="text-xs text-loss">{error}</p>}
            {notice && <p className="text-xs text-profit">{notice}</p>}

            <button
              type="submit"
              disabled={loading || !email || password.length < 6}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-profit/10 hover:bg-profit/15 text-profit rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <>{isSignup ? 'Create account' : 'Sign in'} <ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-border-card text-center">
            <button
              onClick={() => { setMode(isSignup ? 'signin' : 'signup'); setError(null); setNotice(null); }}
              className="text-xs text-text-card-muted hover:text-text-light"
            >
              {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>

        <p className="text-xs text-text-muted text-center mt-6">
          Your session persists across page reloads.
        </p>
      </div>
    </div>
  );
}
