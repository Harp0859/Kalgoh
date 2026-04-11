import { useState, useEffect, useCallback, useMemo } from 'react';

import { LayoutDashboard, Loader2 } from 'lucide-react';

import Sidebar from './layout/Sidebar';
import TopBar from './layout/TopBar';

import Overview from './features/overview/Overview';
import Analytics from './features/analytics/Analytics';
import CalendarGrid from './features/calendar/CalendarGrid';
import TradesTable from './features/trades/TradesTable';
import FileUpload from './features/upload/FileUpload';
import UploadHistory from './features/upload/UploadHistory';
import BrokerStatus from './features/connect-broker/BrokerStatus';
import SettingsPage from './features/settings/SettingsPage';

import { EmptyState, NoDataState } from './shared/EmptyState';
import { useAuth } from './auth/AuthContext';
import LoginPage from './auth/LoginPage';
import { getAllTrades, getAccounts, getSetting, getBalanceOps } from './db/database';
import { getSummaryStats } from './utils/tradeStats';
import { listBrokerConnections, syncBrokerNow } from './features/connect-broker/api';

const PAGE_META = {
  overview:  { title: 'Overview',  subtitle: 'Performance at a glance' },
  analytics: { title: 'Analytics', subtitle: 'Deep dive into your edge' },
  calendar:  { title: 'Calendar',  subtitle: 'Daily profit and loss breakdown' },
  trades:    { title: 'Trades',    subtitle: 'Complete trade history' },
  upload:    { title: 'Connect',   subtitle: 'Link a broker or upload MT5 reports' },
  settings:  { title: 'Settings',  subtitle: 'Configure your dashboard' },
};

export default function App() {
  const { user, loading: authLoading, signOut, changeEmail } = useAuth();

  // Show loading or login screen before anything else
  if (authLoading) {
    return (
      <div
        className="min-h-screen bg-bg flex items-center justify-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-text-muted animate-spin" aria-hidden="true" />
          <span className="text-xs text-text-muted">Loading…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AuthenticatedApp user={user} signOut={signOut} changeEmail={changeEmail} />;
}

function AuthenticatedApp({ user, signOut, changeEmail }) {
  const [tab, setTab] = useState('upload');
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [startingBalance, setStartingBalance] = useState(0);
  const [balanceOps, setBalanceOps] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [autoSyncing, setAutoSyncing] = useState(false);

  // Load trades
  const loadTrades = useCallback(async () => {
    setLoading(true);
    try {
      const [data, accts] = await Promise.all([getAllTrades(), getAccounts()]);
      setTrades(data);
      setAccounts(accts);
    } catch (e) {
      console.error('Failed to load trades:', e);
      setTrades([]);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTrades(); }, [loadTrades, refreshKey]);

  // -----------------------------------------------------------------
  // Auto-sync on login — DISABLED to save MetaApi costs.
  //
  // Every auto-sync triggers a full MetaApi deploy → fetch → undeploy
  // cycle which is billed per hour of deployment. With manual-only
  // sync the user pays only when they click the Sync button.
  //
  // Code kept intact below (not deleted) so we can re-enable it
  // quickly when auto-sync is worth the cost again.
  // -----------------------------------------------------------------
  // useEffect(() => {
  //   let cancelled = false;
  //   async function autoSync() {
  //     try {
  //       const connections = await listBrokerConnections();
  //       const active = connections.filter((c) => c.status === 'active');
  //       if (active.length === 0) return;
  //
  //       setAutoSyncing(true);
  //       await Promise.allSettled(active.map((c) => syncBrokerNow(c.id)));
  //       if (cancelled) return;
  //       setRefreshKey((k) => k + 1); // reload trades
  //     } catch (e) {
  //       console.error('Auto-sync failed:', e);
  //     } finally {
  //       if (!cancelled) setAutoSyncing(false);
  //     }
  //   }
  //   autoSync();
  //   return () => { cancelled = true; };
  //   // Only run once per session — empty deps on purpose.
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  // Load per-account balance data
  useEffect(() => {
    async function loadBalance() {
      try {
        if (selectedAccount === 'all' && accounts.length > 0) {
          let total = 0;
          for (const acct of accounts) {
            const val = await getSetting(`startingBalance_${acct}`, 0);
            total += Number(val) || 0;
          }
          setStartingBalance(total);
        } else if (selectedAccount !== 'all') {
          const val = await getSetting(`startingBalance_${selectedAccount}`, 0);
          setStartingBalance(Number(val) || 0);
        } else {
          setStartingBalance(0);
        }
        const ops = await getBalanceOps(selectedAccount === 'all' ? null : selectedAccount);
        setBalanceOps(ops);
      } catch (e) {
        console.error('Failed to load balance data:', e);
        setStartingBalance(0);
        setBalanceOps([]);
      }
    }
    loadBalance();
  }, [selectedAccount, accounts, refreshKey]);

  // Trades filtered by account only (used as "all history for this account")
  const accountTrades = useMemo(() => {
    if (selectedAccount === 'all') return trades;
    return trades.filter((t) => t.account === selectedAccount);
  }, [trades, selectedAccount]);

  // Then apply the date filter on top
  const filteredTrades = useMemo(() => {
    let result = accountTrades;
    if (dateFrom) result = result.filter((t) => (t.closeTime || t.openTime || '') >= dateFrom);
    if (dateTo) result = result.filter((t) => (t.closeTime || t.openTime || '') <= dateTo + 'T23:59:59');
    return result;
  }, [accountTrades, dateFrom, dateTo]);

  // Compute stats once, share across Overview + Analytics.
  // Pass accountTrades + dateFrom so the equity curve can compute the
  // real balance at the start of the filtered window.
  const stats = useMemo(() => {
    if (filteredTrades.length === 0) return null;
    return getSummaryStats(filteredTrades, startingBalance, balanceOps, accountTrades, dateFrom || null);
  }, [filteredTrades, startingBalance, balanceOps, accountTrades, dateFrom]);

  const hasDateFilter = dateFrom || dateTo;
  const hasTrades = trades.length > 0;
  const hasFiltered = filteredTrades.length > 0;
  const onRefresh = () => setRefreshKey((k) => k + 1);

  const meta = PAGE_META[tab] || PAGE_META.overview;

  return (
    <div className="min-h-screen bg-bg">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>

      <Sidebar tab={tab} setTab={setTab} hasTrades={hasTrades} mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />

      {/* Content area */}
      <main
        id="main-content"
        tabIndex={-1}
        className="lg:ml-[200px] px-4 lg:px-8 pt-[calc(env(safe-area-inset-top)+76px)] lg:pt-6 pb-8 lg:pb-16 pb-safe focus:outline-none"
      >
        <TopBar
          title={meta.title}
          subtitle={meta.subtitle}
          hasTrades={hasTrades}
          tab={tab}
          accounts={accounts}
          selectedAccount={selectedAccount}
          setSelectedAccount={setSelectedAccount}
          dateFrom={dateFrom}
          dateTo={dateTo}
          setDateFrom={setDateFrom}
          setDateTo={setDateTo}
          hasDateFilter={hasDateFilter}
          filteredCount={filteredTrades.length}
          onMenuOpen={() => setMobileMenuOpen(true)}
          mobileMenuOpen={mobileMenuOpen}
          autoSyncing={autoSyncing}
        />

        <div key={tab} className="tab-enter">
          {/* Overview */}
          {tab === 'overview' && hasTrades && (
            hasFiltered && stats ? (
              <Overview stats={stats} trades={filteredTrades} allTrades={accountTrades} balanceOps={balanceOps} startingBalance={startingBalance} hasBalanceOps={balanceOps.length > 1} hasDateFilter={hasDateFilter} />
            ) : <EmptyState message="No trades for this filter." />
          )}

          {/* Analytics */}
          {tab === 'analytics' && hasTrades && (
            hasFiltered && stats ? (
              <Analytics stats={stats} />
            ) : <EmptyState message="No trades for this filter." />
          )}

          {/* Calendar */}
          {tab === 'calendar' && hasTrades && (
            <div className="card-premium bg-card rounded-2xl lg:rounded-3xl p-4 lg:p-8">
              {hasFiltered ? (
                <CalendarGrid
                  trades={filteredTrades}
                  allTrades={accountTrades}
                  startingBalance={startingBalance}
                  balanceOps={balanceOps}
                />
              ) : <EmptyState message="No trades for this filter." dark />}
            </div>
          )}

          {/* Trades */}
          {tab === 'trades' && hasTrades && (
            hasFiltered ? (
              <TradesTable trades={filteredTrades} showAccount={selectedAccount === 'all' && accounts.length > 1} />
            ) : <EmptyState message="No trades for this filter." />
          )}

          {/* Upload */}
          {tab === 'upload' && (
            <div>
              <FileUpload onUploadComplete={onRefresh} />
              <BrokerStatus onDataChange={onRefresh} />
              <UploadHistory refreshKey={refreshKey} onDataChange={onRefresh} />
              {hasTrades && (
                <div className="mt-8 max-w-2xl mx-auto">
                  <button
                    onClick={() => setTab('overview')}
                    className="w-full px-6 py-4 bg-card hover:bg-card-light text-text-light rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-colors duration-200 shadow-lg shadow-black/5"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    View Dashboard
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          {tab === 'settings' && (
            <SettingsPage
              accounts={accounts}
              startingBalance={startingBalance}
              selectedAccount={selectedAccount}
              onStartingBalanceChange={() => onRefresh()}
              onDataChange={onRefresh}
              onSignOut={signOut}
              user={user}
              onChangeEmail={changeEmail}
            />
          )}

          {/* No data */}
          {tab !== 'upload' && tab !== 'settings' && !hasTrades && (
            <NoDataState onGoToUpload={() => setTab('upload')} />
          )}
        </div>
      </main>
    </div>
  );
}
