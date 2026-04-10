import { useState } from 'react';
import { Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { signInWithEmail, verifyOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSendOtp(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email);
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyOtp(email, otp);
      // auth state listener will update user and App will re-render
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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
          {step === 'email' ? (
            <form onSubmit={handleSendOtp}>
              <h2 className="text-xl font-semibold text-text-light mb-1">Sign in</h2>
              <p className="text-sm text-text-card-muted mb-6">We'll send you a one-time code by email</p>

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
                    className="bg-transparent text-text-light text-sm font-medium w-full focus:outline-none"
                  />
                </div>
              </label>

              {error && (
                <p className="text-xs text-loss mt-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 bg-profit/10 hover:bg-profit/15 text-profit rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-profit" />
                <h2 className="text-xl font-semibold text-text-light">Check your email</h2>
              </div>
              <p className="text-sm text-text-card-muted mb-2">
                We sent a sign-in link + a 6-digit code to <span className="text-text-light font-medium">{email}</span>
              </p>
              <p className="text-xs text-text-card-muted mb-6">
                Click the link in your email, or enter the code below.
              </p>

              <label className="block">
                <span className="text-xs text-text-card-muted font-medium uppercase tracking-wider">Verification code</span>
                <div className="mt-2 bg-card-lighter rounded-xl px-4 py-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    autoFocus
                    className="bg-transparent text-text-light text-xl font-bold tracking-[0.3em] text-center w-full focus:outline-none"
                  />
                </div>
              </label>

              {error && (
                <p className="text-xs text-loss mt-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 bg-profit/10 hover:bg-profit/15 text-profit rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify <ArrowRight className="w-4 h-4" /></>}
              </button>

              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(''); setError(null); }}
                className="mt-3 w-full text-xs text-text-card-muted hover:text-text-light py-2"
              >
                Use a different email
              </button>
            </form>
          )}
        </div>

        <p className="text-xs text-text-muted text-center mt-6">
          No password needed. A fresh code is sent each time.
        </p>
      </div>
    </div>
  );
}
