import { useState, useEffect } from 'react';
import { Wallet, Trash2, AlertTriangle, Database, LogOut } from 'lucide-react';
import { clearAllData, getSetting, setSetting } from '../../db/database';

export default function SettingsPage({ accounts, startingBalance, selectedAccount, onStartingBalanceChange, onDataChange, onSignOut }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [accountBalances, setAccountBalances] = useState({});
  const [editingAccount, setEditingAccount] = useState(null);
  const [editValue, setEditValue] = useState('');

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
      {/* Accounts with individual balances */}
      <div className="bg-card rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-card-lighter flex items-center justify-center">
            <Wallet className="w-4.5 h-4.5 text-text-card-muted" />
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
                <div key={acct} className="flex items-center justify-between bg-card-lighter rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-text-light">{acct}</p>
                    {!isEditing && (
                      <p className="text-xs text-text-card-muted mt-0.5">
                        Starting: <span className={bal > 0 ? 'text-text-light' : 'text-text-card-muted'}>${bal.toFixed(2)}</span>
                      </p>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-card rounded-lg px-3 py-1.5">
                        <span className="text-text-card-muted text-xs">$</span>
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveAccountBalance(acct)}
                          className="bg-transparent text-text-light text-sm font-medium w-24 focus:outline-none"
                          autoFocus
                        />
                      </div>
                      <button onClick={() => saveAccountBalance(acct)} className="text-[11px] px-3 py-1.5 bg-profit/10 text-profit rounded-lg font-medium">Save</button>
                      <button onClick={() => setEditingAccount(null)} className="text-[11px] px-3 py-1.5 text-text-card-muted">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingAccount(acct); setEditValue(String(bal || '')); }}
                      className="text-[11px] text-text-card-muted hover:text-text-light font-medium px-3 py-1.5 rounded-lg hover:bg-card transition-colors"
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
                <span className="text-sm font-bold text-text-light">${totalBalance.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sign out */}
      {onSignOut && (
        <div className="bg-card rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-card-lighter flex items-center justify-center">
                <LogOut className="w-4.5 h-4.5 text-text-card-muted" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text-light">Sign Out</h3>
                <p className="text-xs text-text-card-muted mt-0.5">Your data stays safely in the cloud</p>
              </div>
            </div>
            <button onClick={onSignOut} className="text-xs text-text-card-muted hover:text-text-light font-medium px-4 py-2.5 bg-card-lighter rounded-xl hover:bg-card-light transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="bg-card rounded-3xl p-6 border border-loss/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-loss/10 flex items-center justify-center">
            <Trash2 className="w-4.5 h-4.5 text-loss" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-light">Clear All Data</h3>
            <p className="text-xs text-text-card-muted mt-0.5">Remove all trades, uploads, notes, and balance data</p>
          </div>
        </div>

        {confirmClear ? (
          <div className="flex items-center gap-3 bg-loss/5 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-loss shrink-0" />
            <span className="text-xs text-loss font-medium flex-1">This cannot be undone. Are you sure?</span>
            <button onClick={handleClearAll} className="text-xs px-4 py-2 bg-loss/20 text-loss rounded-lg font-semibold hover:bg-loss/30 transition-colors">
              Yes, clear everything
            </button>
            <button onClick={() => setConfirmClear(false)} className="text-xs px-4 py-2 bg-card-lighter text-text-card-muted rounded-lg font-medium hover:bg-card-light transition-colors">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            className="text-xs text-loss hover:text-loss/80 font-medium px-4 py-2.5 bg-loss/5 rounded-xl hover:bg-loss/10 transition-colors"
          >
            Clear All Data
          </button>
        )}
      </div>
    </div>
  );
}
