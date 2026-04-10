import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Link2,
  X,
  Loader2,
  Eye,
  EyeOff,
  Info,
  Building2,
  Server,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { connectBroker, fetchBrokers } from './api';
import SearchableCombobox from '../../shared/SearchableCombobox';

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
  const [fieldErrors, setFieldErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Broker picker state
  const [brokers, setBrokers] = useState({}); // { brokerName: string[] }
  const [selectedBroker, setSelectedBroker] = useState('');
  const [brokersLoading, setBrokersLoading] = useState(false);
  const [brokersError, setBrokersError] = useState('');
  const [manualMode, setManualMode] = useState(false);

  const nicknameRef = useRef(null);
  const dialogRef = useRef(null);

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
      setFieldErrors({});
      setShowSuccess(false);
      setSelectedBroker('');
      setManualMode(false);
    }
  }, [open]);

  // Auto-focus the first field when the dialog opens.
  useEffect(() => {
    if (open && nicknameRef.current) {
      const id = requestAnimationFrame(() => nicknameRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  // Escape key closes the dialog (unless submitting).
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === 'Escape' && !submitting) {
        e.stopPropagation();
        onClose?.();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, submitting, onClose]);

  // Focus trap — cycle Tab inside the dialog.
  useEffect(() => {
    if (!open) return;
    function handleTab(e) {
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [open]);

  const loadBrokers = useCallback(async () => {
    setBrokersLoading(true);
    setBrokersError('');
    try {
      const result = await fetchBrokers();
      setBrokers(result || {});
    } catch (err) {
      setBrokersError(err.message || 'Failed to load brokers.');
    } finally {
      setBrokersLoading(false);
    }
  }, []);

  // Fetch brokers on open.
  useEffect(() => {
    if (open) loadBrokers();
  }, [open, loadBrokers]);

  // Broker options (sorted alphabetically, case-insensitive).
  const brokerOptions = useMemo(
    () =>
      Object.keys(brokers)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
        .map((name) => ({ value: name, label: name })),
    [brokers]
  );

  // Server options for the currently selected broker.
  const serverOptions = useMemo(() => {
    if (!selectedBroker) return [];
    const list = brokers[selectedBroker] || [];
    return list.map((s) => ({ value: s, label: s }));
  }, [brokers, selectedBroker]);

  function handleBrokerChange(name) {
    setSelectedBroker(name);
    // Reset the server whenever the broker changes.
    setServer('');
  }

  // The form is "dirty" if any user-entry field has content.
  const formTouched =
    nickname.trim().length > 0 ||
    login.trim().length > 0 ||
    investorPassword.length > 0 ||
    server.trim().length > 0;

  function handleBackdropClick() {
    if (submitting) return;
    // Don't close mid-entry. User must use X or Escape.
    if (formTouched) return;
    onClose?.();
  }

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const errs = {};
    if (!nickname.trim()) errs.nickname = 'Required';
    if (!server.trim()) errs.server = 'Required';
    if (!login.trim()) errs.login = 'Required';
    if (!investorPassword) errs.password = 'Required';
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError('Please fill in all required fields.');
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
      // Brief success flash before closing.
      setShowSuccess(true);
      setTimeout(() => {
        onConnected?.();
        onClose?.();
      }, 450);
    } catch (err) {
      setError(err.message || 'Failed to connect broker.');
      setSubmitting(false);
    }
  }

  const brokerCount = brokerOptions.length;

  const inputBase =
    'mt-2 w-full min-h-[44px] bg-card-lighter rounded-xl px-4 py-3 text-sm text-text-light placeholder:text-text-card-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card transition-shadow';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-backdropFadeIn"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-broker-title"
        className="card-premium card-premium-blue w-full max-w-md bg-card rounded-3xl p-6 lg:p-7 shadow-2xl shadow-black/50 max-h-[92vh] overflow-y-auto animate-dialogScaleIn pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:pb-7 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success overlay */}
        {showSuccess && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/95 rounded-3xl animate-backdropFadeIn">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-profit/15 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-profit" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-text-light">Connected</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-card-lighter flex items-center justify-center">
              <Link2 className="w-4 h-4 text-text-card-muted" aria-hidden="true" />
            </div>
            <div>
              <h3 id="connect-broker-title" className="text-base font-semibold text-text-light">Connect broker</h3>
              <p className="text-xs text-text-card-muted mt-0.5">Auto-sync MT4/MT5 trade history</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close dialog"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-text-card-muted hover:text-text-light hover:bg-card-lighter disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Platform */}
          <div>
            <label className="text-[11px] uppercase tracking-wide text-text-card-muted font-medium">Platform</label>
            <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Trading platform">
              {['mt5', 'mt4'].map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={platform === p}
                  onClick={() => setPlatform(p)}
                  disabled={submitting}
                  className={`min-h-[44px] py-3 rounded-xl text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
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
            <label htmlFor="broker-nickname" className="text-[11px] uppercase tracking-wide text-text-card-muted font-medium">Nickname</label>
            <input
              id="broker-nickname"
              ref={nicknameRef}
              type="text"
              value={nickname}
              onChange={(e) => { setNickname(e.target.value); if (fieldErrors.nickname) setFieldErrors((f) => ({ ...f, nickname: undefined })); }}
              disabled={submitting}
              placeholder="Main Live Account"
              aria-invalid={!!fieldErrors.nickname}
              aria-describedby="broker-nickname-help"
              className={`${inputBase} ${fieldErrors.nickname ? 'ring-2 ring-loss/60' : ''}`}
            />
            <p id="broker-nickname-help" className="text-xs text-text-card-muted/70 mt-1.5">
              {fieldErrors.nickname ? <span className="text-loss">{fieldErrors.nickname}</span> : 'Shown in your account dropdown.'}
            </p>
          </div>

          {/* Broker + Server picker (or manual fallback) */}
          {!manualMode ? (
            <>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-text-card-muted font-medium">Broker</label>
                <div className="mt-2">
                  {brokersLoading ? (
                    <div className="flex items-center gap-2.5 px-4 py-3 min-h-[44px] rounded-xl bg-card-lighter text-xs text-text-card-muted" role="status" aria-live="polite">
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Loading brokers...
                    </div>
                  ) : brokersError ? (
                    <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-loss/10 text-loss" role="alert">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-relaxed break-words">{brokersError}</p>
                        <button
                          type="button"
                          onClick={loadBrokers}
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-loss hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-loss/40 rounded"
                        >
                          <RefreshCw className="w-3 h-3" aria-hidden="true" /> Retry
                        </button>
                      </div>
                    </div>
                  ) : (
                    <SearchableCombobox
                      value={selectedBroker}
                      onChange={handleBrokerChange}
                      options={brokerOptions}
                      placeholder={
                        brokerCount > 0
                          ? `Select broker (${brokerCount} available)`
                          : 'No brokers available'
                      }
                      icon={Building2}
                      disabled={submitting || brokerCount === 0}
                      emptyMessage="No brokers match"
                      ariaLabel="Select broker"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wide text-text-card-muted font-medium">Server</label>
                <div className="mt-2">
                  <SearchableCombobox
                    value={server}
                    onChange={(v) => { setServer(v); if (fieldErrors.server) setFieldErrors((f) => ({ ...f, server: undefined })); }}
                    options={serverOptions}
                    placeholder={
                      !selectedBroker
                        ? 'Select a broker first'
                        : serverOptions.length > 0
                          ? `Select server (${serverOptions.length} available)`
                          : 'No servers listed'
                    }
                    icon={Server}
                    disabled={submitting || !selectedBroker || serverOptions.length === 0}
                    emptyMessage="No servers match"
                    ariaLabel="Select server"
                  />
                </div>
                {fieldErrors.server && (
                  <p className="text-xs text-loss mt-1.5">{fieldErrors.server}</p>
                )}
                <button
                  type="button"
                  onClick={() => setManualMode(true)}
                  className="mt-2 text-xs text-text-card-muted hover:text-text-light underline decoration-dotted underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/40 rounded"
                >
                  Can't find your broker?
                </button>
              </div>
            </>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="broker-server-manual" className="text-[11px] uppercase tracking-wide text-text-card-muted font-medium">
                  Broker server
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setManualMode(false);
                    setServer('');
                  }}
                  className="text-xs text-text-card-muted hover:text-text-light underline decoration-dotted underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/40 rounded"
                >
                  Back to broker list
                </button>
              </div>
              <input
                id="broker-server-manual"
                type="text"
                value={server}
                onChange={(e) => { setServer(e.target.value); if (fieldErrors.server) setFieldErrors((f) => ({ ...f, server: undefined })); }}
                disabled={submitting}
                placeholder="ICMarkets-Live04"
                aria-invalid={!!fieldErrors.server}
                aria-describedby="broker-server-help"
                className={`${inputBase} ${fieldErrors.server ? 'ring-2 ring-loss/60' : ''}`}
              />
              <p id="broker-server-help" className="text-xs text-text-card-muted/70 mt-1.5">
                {fieldErrors.server ? (
                  <span className="text-loss">{fieldErrors.server}</span>
                ) : (
                  'Enter the exact server name shown in your MT4/MT5 terminal.'
                )}
              </p>
            </div>
          )}

          {/* Login */}
          <div>
            <label htmlFor="broker-login" className="text-[11px] uppercase tracking-wide text-text-card-muted font-medium">Account login</label>
            <input
              id="broker-login"
              type="text"
              inputMode="numeric"
              value={login}
              onChange={(e) => { setLogin(e.target.value); if (fieldErrors.login) setFieldErrors((f) => ({ ...f, login: undefined })); }}
              disabled={submitting}
              placeholder="12345678"
              aria-invalid={!!fieldErrors.login}
              className={`${inputBase} tabular-nums ${fieldErrors.login ? 'ring-2 ring-loss/60' : ''}`}
            />
            {fieldErrors.login && <p className="text-xs text-loss mt-1.5">{fieldErrors.login}</p>}
          </div>

          {/* Investor password */}
          <div>
            <label htmlFor="broker-password" className="text-[11px] uppercase tracking-wide text-text-card-muted font-medium">Investor password</label>
            <div className="mt-2 relative">
              <input
                id="broker-password"
                type={showPassword ? 'text' : 'password'}
                value={investorPassword}
                onChange={(e) => { setInvestorPassword(e.target.value); if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined })); }}
                disabled={submitting}
                placeholder="Read-only password"
                aria-invalid={!!fieldErrors.password}
                className={`w-full min-h-[44px] bg-card-lighter rounded-xl px-4 py-3 pr-12 text-sm text-text-light placeholder:text-text-card-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card ${fieldErrors.password ? 'ring-2 ring-loss/60' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg text-text-card-muted hover:text-text-light hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
            {fieldErrors.password && <p className="text-xs text-loss mt-1.5">{fieldErrors.password}</p>}
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-2.5 bg-card-lighter rounded-xl px-3.5 py-3">
            <Info className="w-4 h-4 text-text-card-muted shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-text-card-muted leading-relaxed">
              Use your <span className="text-text-light font-medium">investor</span> (read-only) password,
              never the master password. It's encrypted at rest and only used to pull trade history.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-loss/10 text-loss text-xs rounded-xl px-3.5 py-3" role="alert">{error}</div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 min-h-[44px] py-3 bg-card-lighter hover:bg-card-light text-text-card-muted rounded-xl text-sm font-medium transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 min-h-[44px] py-3 bg-profit/15 hover:bg-profit/20 text-profit rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
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
