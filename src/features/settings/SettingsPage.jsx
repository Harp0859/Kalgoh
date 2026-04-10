import { useState, useEffect } from 'react';
import { Wallet, Trash2, AlertTriangle, Database, LogOut, Mail, Sun, Moon, Monitor, Palette } from 'lucide-react';
import { clearAllData, getSetting, setSetting } from '../../db/database';
import { useTheme } from '../../theme/ThemeContext';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function SettingsPage({ accounts, startingBalance, selectedAccount, onStartingBalanceChange, onDataChange, onSignOut, user, onChangeEmail }) {
  const { preference: themePreference, setPreference: setThemePreference } = useTheme();
  const [confirmClear, setConfirmClear] = useState(false);
  const [accountBalances, setAccountBalances] = useState({});
  const [editingAccount, setEditingAccount] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState(null);

  // Load per-account balances
  useEffect(() => {
    async function load() {
      try {
        const balances = {};
        for (const acct of accounts) {
          const val = await getSetting(`startingBalance_${acct}`, 0);
          balances[acct] = Number(val) || 0;
        }
        setAccountBalances(balances);
      } catch (e) {
        console.error('Failed to load account balances:', e);
      }
    }
    load();
  }, [accounts]);

  async function saveAccountBalance(acct) {
    const val = parseFloat(editValue) || 0;
    try {
      await setSetting(`startingBalance_${acct}`, val);
      setAccountBalances((prev) => ({ ...prev, [acct]: val }));
      setEditingAccount(null);
      onStartingBalanceChange(val);
    } catch (e) {
      console.error('Failed to save balance:', e);
    }
  }

  async function handleEmailChange() {
    if (!newEmail || !newEmail.includes('@')) return;
    setEmailStatus({ type: 'loading' });
    try {
      await onChangeEmail(newEmail);
      setEmailStatus({ type: 'success', message: `Confirmation sent to ${newEmail}. Click the link in that email to confirm the change.` });
      setEditingEmail(false);
    } catch (e) {
      setEmailStatus({ type: 'error', message: e.message });
    }
  }

  async function handleClearAll() {
    try {
      await clearAllData();
      setConfirmClear(false);
      onDataChange();
    } catch (e) {
      console.error('Failed to clear data:', e);
    }
  }

  const totalBalance = Object.values(accountBalances).reduce((s, v) => s + v, 0);

  return (
    <div className="max-w-2xl space-y-4 lg:space-y-6">
      {/* Appearance */}
      <div className="card-premium bg-card rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-card-lighter flex items-center justify-center">
            <Palette className="w-4 h-4 text-text-card-muted" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-light">Appearance</h3>
            <p className="text-xs text-text-card-muted mt-0.5">Choose a theme for the dashboard</p>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-label="Theme preference"
          className="grid grid-cols-3 gap-2 bg-card-lighter rounded-xl p-1"
        >
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
            const selected = themePreference === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setThemePreference(value)}
                className={`min-h-[44px] flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                  selected
                    ? 'bg-card text-text-light shadow-sm shadow-black/20'
                    : 'text-text-card-muted hover:text-text-light'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Email / Account */}
      {user && (
        <div className="card-premium bg-card rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-card-lighter flex items-center justify-center">
              <Mail className="w-4 h-4 text-text-card-muted" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-light">Email</h3>
              <p className="text-xs text-text-card-muted mt-0.5">Used for sign-in. Changes require confirmation.</p>
            </div>
          </div>

          {editingEmail ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailChange()}
                placeholder="new@email.com"
                aria-label="New email address"
                autoFocus
                className="flex-1 min-w-[180px] min-h-[44px] bg-card-lighter rounded-xl px-4 py-3 text-sm text-text-light placeholder-text-card-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              />
              <button
                type="button"
                onClick={handleEmailChange}
                disabled={emailStatus?.type === 'loading'}
                className="min-h-[44px] text-xs px-4 py-3 bg-profit/10 text-profit rounded-xl font-medium hover:bg-profit/15 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card transition-colors"
              >
                {emailStatus?.type === 'loading' ? 'Sending...' : 'Send confirmation'}
              </button>
              <button
                type="button"
                onClick={() => { setEditingEmail(false); setEmailStatus(null); setNewEmail(''); }}
                className="min-h-[44px] text-xs px-3 py-3 text-text-card-muted hover:text-text-light rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/40"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-card-lighter rounded-xl px-4 py-3 gap-3">
              <span className="text-sm font-medium text-text-light truncate">{user.email}</span>
              <button
                type="button"
                onClick={() => { setEditingEmail(true); setNewEmail(''); setEmailStatus(null); }}
                className="min-h-[36px] text-xs text-text-card-muted hover:text-text-light font-medium px-3 py-2 rounded-lg hover:bg-card transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/40"
              >
                Change
              </button>
            </div>
          )}

          {emailStatus?.type === 'success' && (
            <p className="text-xs text-profit mt-3" role="status">{emailStatus.message}</p>
          )}
          {emailStatus?.type === 'error' && (
            <p className="text-xs text-loss mt-3" role="alert">{emailStatus.message}</p>
          )}
        </div>
      )}

      {/* Accounts with individual balances */}
      <div className="card-premium bg-card rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-card-lighter flex items-center justify-center">
            <Wallet className="w-4 h-4 text-text-card-muted" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-light">Account Balances</h3>
            <p className="text-xs text-text-card-muted mt-0.5">
              Auto-detected from MT5 reports &middot; Edit to override
            </p>
          </div>
        </div>

        {accounts.length === 0 ? (
          <p className="text-sm text-text-card-muted">No accounts loaded. Upload a report first.</p>
        ) : (
          <div className="space-y-2">
            {accounts.map((acct) => {
              const bal = accountBalances[acct] || 0;
              const isEditing = editingAccount === acct;

              return (
                <div key={acct} className="flex flex-wrap items-center justify-between bg-card-lighter rounded-xl px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-light truncate">{acct}</p>
                    {!isEditing && (
                      <p className="text-xs text-text-card-muted mt-0.5">
                        Starting: <span className={`tabular-nums ${bal > 0 ? 'text-text-light' : 'text-text-card-muted'}`}>${bal.toFixed(2)}</span>
                      </p>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1 bg-card rounded-xl px-3 min-h-[40px]">
                        <span className="text-text-card-muted text-xs">$</span>
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveAccountBalance(acct)}
                          aria-label={`Starting balance for ${acct}`}
                          className="bg-transparent text-text-light text-sm font-medium w-24 focus:outline-none tabular-nums"
                          autoFocus
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => saveAccountBalance(acct)}
                        className="min-h-[40px] text-xs px-3 py-2 bg-profit/10 text-profit rounded-xl font-medium hover:bg-profit/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card transition-colors"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAccount(null)}
                        className="min-h-[40px] text-xs px-3 py-2 text-text-card-muted rounded-xl hover:text-text-light focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/40"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setEditingAccount(acct); setEditValue(String(bal || '')); }}
                      className="min-h-[36px] text-xs text-text-card-muted hover:text-text-light font-medium px-3 py-2 rounded-lg hover:bg-card transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/40"
                    >
                      Edit
                    </button>
                  )}
                </div>
              );
            })}

            {/* Total */}
            {accounts.length > 1 && (
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-border-card px-1">
                <span className="text-xs text-text-card-muted font-medium">Combined Starting Balance</span>
                <span className="text-sm font-bold text-text-light tabular-nums">${totalBalance.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sign out */}
      {onSignOut && (
        <div className="card-premium bg-card rounded-3xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-card-lighter flex items-center justify-center shrink-0">
                <LogOut className="w-4 h-4 text-text-card-muted" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-text-light">Sign Out</h3>
                <p className="text-xs text-text-card-muted mt-0.5">Your data stays safely in the cloud</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="min-h-[44px] text-xs text-text-card-muted hover:text-text-light font-medium px-4 py-3 bg-card-lighter rounded-xl hover:bg-card-light transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="card-premium card-premium-loss bg-card rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-loss/10 flex items-center justify-center">
            <Trash2 className="w-4 h-4 text-loss" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-light">Clear All Data</h3>
            <p className="text-xs text-text-card-muted mt-0.5">Remove all trades, uploads, notes, and balance data</p>
          </div>
        </div>

        {confirmClear ? (
          <div className="flex flex-wrap items-center gap-3 bg-loss/5 rounded-xl px-4 py-3" role="alert">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <AlertTriangle className="w-4 h-4 text-loss shrink-0" aria-hidden="true" />
              <span className="text-xs text-loss font-medium">This cannot be undone. Are you sure?</span>
            </div>
            <button
              type="button"
              onClick={handleClearAll}
              className="min-h-[40px] text-xs px-4 py-2 bg-loss/20 text-loss rounded-xl font-semibold hover:bg-loss/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-loss/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              Yes, clear everything
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="min-h-[40px] text-xs px-4 py-2 bg-card-lighter text-text-card-muted rounded-xl font-medium hover:bg-card-light transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="min-h-[44px] text-xs text-loss hover:text-loss/80 font-medium px-4 py-3 bg-loss/5 rounded-xl hover:bg-loss/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-loss/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            Clear All Data
          </button>
        )}
      </div>
    </div>
  );
}
