import { useState, useEffect } from 'react';
import { Link2, X, Loader2, Eye, EyeOff, Info } from 'lucide-react';
import { connectBroker } from './api';

// Modal dialog for connecting a new MT4 / MT5 account via MetaApi.
// Renders as a fixed-position overlay; parent controls open/close via `open`.
export default function ConnectBrokerDialog({ open, onClose, onConnected }) {
  const [platform, setPlatform] = useState('mt5');
  const [nickname, setNickname] = useState('');
  const [server, setServer] = useState('');
  const [login, setLogin] = useState('');
  const [investorPassword, setInvestorPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset state whenever the dialog is reopened.
  useEffect(() => {
    if (open) {
      setPlatform('mt5');
      setNickname('');
      setServer('');
      setLogin('');
      setInvestorPassword('');
      setShowPassword(false);
      setSubmitting(false);
      setError('');
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!nickname.trim() || !server.trim() || !login.trim() || !investorPassword) {
      setError('All fields are required.');
      return;
    }

    setSubmitting(true);
    try {
      await connectBroker({
        platform,
        nickname: nickname.trim(),
        server: server.trim(),
        login: login.trim(),
        investorPassword,
      });
      onConnected?.();
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to connect broker.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card rounded-3xl p-6 lg:p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-card-lighter flex items-center justify-center">
              <Link2 className="w-4.5 h-4.5 text-text-card-muted" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-light">Connect broker</h3>
              <p className="text-xs text-text-card-muted mt-0.5">Auto-sync MT4/MT5 trade history</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-text-card-muted hover:text-text-light p-1 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Platform */}
          <div>
            <label className="text-[11px] uppercase tracking-wide text-text-card-muted font-medium">Platform</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {['mt5', 'mt4'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  disabled={submitting}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    platform === p
                      ? 'bg-profit/10 text-profit border border-profit/30'
                      : 'bg-card-lighter text-text-card-muted hover:bg-card-light border border-transparent'
                  }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Nickname */}
          <div>
            <label className="text-[11px] uppercase tracking-wide text-text-card-muted font-medium">Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={submitting}
              placeholder="Main Live Account"
              className="mt-2 w-full bg-card-lighter rounded-xl px-4 py-2.5 text-sm text-text-light placeholder:text-text-card-muted/60 focus:outline-none focus:ring-1 focus:ring-profit/40"
            />
            <p className="text-[11px] text-text-card-muted/70 mt-1.5">Shown in your account dropdown.</p>
          </div>

          {/* Server */}
          <div>
            <label className="text-[11px] uppercase tracking-wide text-text-card-muted font-medium">Broker server</label>
            <input
              type="text"
              value={server}
              onChange={(e) => setServer(e.target.value)}
              disabled={submitting}
              placeholder="ICMarkets-Live04"
              className="mt-2 w-full bg-card-lighter rounded-xl px-4 py-2.5 text-sm text-text-light placeholder:text-text-card-muted/60 focus:outline-none focus:ring-1 focus:ring-profit/40"
            />
          </div>

          {/* Login */}
          <div>
            <label className="text-[11px] uppercase tracking-wide text-text-card-muted font-medium">Account login</label>
            <input
              type="text"
              inputMode="numeric"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              disabled={submitting}
              placeholder="12345678"
              className="mt-2 w-full bg-card-lighter rounded-xl px-4 py-2.5 text-sm text-text-light placeholder:text-text-card-muted/60 focus:outline-none focus:ring-1 focus:ring-profit/40"
            />
          </div>

          {/* Investor password */}
          <div>
            <label className="text-[11px] uppercase tracking-wide text-text-card-muted font-medium">Investor password</label>
            <div className="mt-2 relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={investorPassword}
                onChange={(e) => setInvestorPassword(e.target.value)}
                disabled={submitting}
                placeholder="Read-only password"
                className="w-full bg-card-lighter rounded-xl px-4 py-2.5 pr-10 text-sm text-text-light placeholder:text-text-card-muted/60 focus:outline-none focus:ring-1 focus:ring-profit/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-card-muted hover:text-text-light"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-2.5 bg-card-lighter rounded-xl px-3.5 py-3">
            <Info className="w-3.5 h-3.5 text-text-card-muted shrink-0 mt-0.5" />
            <p className="text-[11px] text-text-card-muted leading-relaxed">
              Use your <span className="text-text-light font-medium">investor</span> (read-only) password,
              never the master password. It's encrypted at rest and only used to pull trade history.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-loss/10 text-loss text-xs rounded-xl px-3.5 py-2.5">{error}</div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2.5 bg-card-lighter hover:bg-card-light text-text-card-muted rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-profit/15 hover:bg-profit/20 text-profit rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting…
                </>
              ) : (
                'Connect'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
