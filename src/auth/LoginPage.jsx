import { useState, useRef, useEffect } from 'react';
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
  const [fieldErrors, setFieldErrors] = useState({});
  const emailRef = useRef(null);

  // Auto-focus the email input on mount.
  useEffect(() => {
    const id = requestAnimationFrame(() => emailRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    // Field-level validation.
    const errs = {};
    if (!email || !email.includes('@')) errs.email = 'Enter a valid email address';
    if (!password || password.length < 6) errs.password = 'At least 6 characters';
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

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
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-text-primary tracking-tight">Kalgoh</h1>
          <p className="text-sm text-text-muted mt-2">MT5 trading analytics</p>
        </div>

        {/* Auth card */}
        <div className="bg-card rounded-3xl p-7 lg:p-8 shadow-xl shadow-black/10">
          <h2 className="text-xl font-semibold text-text-light mb-1">
            {isSignup ? 'Create account' : 'Sign in'}
          </h2>
          <p className="text-sm text-text-card-muted mb-6">
            {isSignup ? 'Use your email and a password to get started' : 'Welcome back'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <label className="block">
              <span className="text-xs text-text-card-muted font-medium uppercase tracking-wider">Email</span>
              <div
                className={`mt-2 flex items-center gap-2 bg-card-lighter rounded-xl px-4 py-3 min-h-[48px] focus-within:ring-2 focus-within:ring-profit/50 focus-within:ring-offset-2 focus-within:ring-offset-card transition-shadow ${
                  fieldErrors.email ? 'ring-2 ring-loss/60' : ''
                }`}
              >
                <Mail className="w-4 h-4 text-text-card-muted shrink-0" aria-hidden="true" />
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
                  }}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  className="bg-transparent text-text-light text-sm font-medium w-full focus:outline-none"
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="text-xs text-loss mt-1.5">{fieldErrors.email}</p>
              )}
            </label>

            <label className="block">
              <span className="text-xs text-text-card-muted font-medium uppercase tracking-wider">Password</span>
              <div
                className={`mt-2 flex items-center gap-2 bg-card-lighter rounded-xl pl-4 pr-1.5 py-1.5 min-h-[48px] focus-within:ring-2 focus-within:ring-profit/50 focus-within:ring-offset-2 focus-within:ring-offset-card transition-shadow ${
                  fieldErrors.password ? 'ring-2 ring-loss/60' : ''
                }`}
              >
                <Lock className="w-4 h-4 text-text-card-muted shrink-0" aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
                  }}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  className="bg-transparent text-text-light text-sm font-medium w-full focus:outline-none py-1.5"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-text-card-muted hover:text-text-light hover:bg-card shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="text-xs text-loss mt-1.5">{fieldErrors.password}</p>
              )}
            </label>

            {error && <p className="text-xs text-loss" role="alert">{error}</p>}
            {notice && <p className="text-xs text-profit" role="status">{notice}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] flex items-center justify-center gap-2 px-6 py-3 bg-profit/10 hover:bg-profit/15 text-profit rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                : <>{isSignup ? 'Create account' : 'Sign in'} <ArrowRight className="w-4 h-4" aria-hidden="true" /></>
              }
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-border-card text-center">
            <button
              type="button"
              onClick={() => { setMode(isSignup ? 'signin' : 'signup'); setError(null); setNotice(null); setFieldErrors({}); }}
              className="text-xs text-text-card-muted hover:text-text-light py-2 px-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/40"
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
