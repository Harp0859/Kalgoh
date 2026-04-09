import { useState, useEffect, useCallback, useMemo } from 'react';
import { Upload, BarChart3, Calendar, Table2, LayoutDashboard, Users } from 'lucide-react';
import FileUpload from './components/FileUpload';
import UploadHistory from './components/UploadHistory';
import TradesTable from './components/TradesTable';
import DailyCalendar from './components/DailyCalendar';
import Dashboard from './components/Dashboard';
import { getAllTrades, getAccounts } from './db/database';

const TABS = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'trades', label: 'Trades', icon: Table2 },
];

function App() {
  const [tab, setTab] = useState('upload');
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadTrades = useCallback(async () => {
    setLoading(true);
    const [data, accts] = await Promise.all([getAllTrades(), getAccounts()]);
    setTrades(data);
    setAccounts(accts);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTrades();
  }, [loadTrades, refreshKey]);

  const filteredTrades = useMemo(() => {
    if (selectedAccount === 'all') return trades;
    return trades.filter((t) => t.account === selectedAccount);
  }, [trades, selectedAccount]);

  function onUploadComplete() {
    setRefreshKey((k) => k + 1);
  }

  function onDataChange() {
    setRefreshKey((k) => k + 1);
  }

  const hasTrades = trades.length > 0;
  const hasFiltered = filteredTrades.length > 0;

  return (
    <div className="min-h-screen bg-[#13131f]">
      {/* Header */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <BarChart3 className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-base font-semibold text-text tracking-tight">Kalgoh</span>
              <span className="text-xs text-text-muted ml-1 hidden sm:block">MT5 Dashboard</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Account Selector */}
              {hasTrades && accounts.length > 1 && tab !== 'upload' && (
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-text-muted" />
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="bg-surface-light border border-border rounded-lg px-2 py-1 text-xs text-text focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="all">All Accounts ({trades.length})</option>
                    {accounts.map((a) => {
                      const count = trades.filter((t) => t.account === a).length;
                      return (
                        <option key={a} value={a}>{a} ({count})</option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Tab Navigation */}
              <nav className="flex gap-1">
                {TABS.map(({ id, label, icon: Icon }) => {
                  const disabled = id !== 'upload' && !hasTrades;
                  return (
                    <button
                      key={id}
                      onClick={() => !disabled && setTab(id)}
                      disabled={disabled}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                        ${tab === id
                          ? 'bg-primary/15 text-primary'
                          : disabled
                            ? 'text-text-muted/40 cursor-not-allowed'
                            : 'text-text-muted hover:text-text hover:bg-surface-light'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Upload Tab */}
        {tab === 'upload' && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-text">Import Trading Data</h1>
              <p className="text-sm text-text-muted mt-1">Upload your MT5 trade history reports to get started</p>
            </div>
            <FileUpload onUploadComplete={onUploadComplete} />
            <UploadHistory refreshKey={refreshKey} onDataChange={onDataChange} />

            {hasTrades && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setTab('dashboard')}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  View Dashboard
                </button>
              </div>
            )}
          </div>
        )}

        {/* Dashboard Tab */}
        {tab === 'dashboard' && hasTrades && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-text">
                {selectedAccount === 'all' ? 'All Accounts' : selectedAccount}
              </h1>
              <span className="text-sm text-text-muted">{filteredTrades.length} trades</span>
            </div>
            {hasFiltered ? (
              <Dashboard trades={filteredTrades} />
            ) : (
              <p className="text-text-muted text-center py-10">No trades for this account.</p>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {tab === 'calendar' && hasTrades && (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-text">Daily Calendar</h1>
              <span className="text-sm text-text-muted">
                {selectedAccount === 'all' ? 'All Accounts' : selectedAccount}
              </span>
            </div>
            <div className="bg-surface rounded-xl border border-border p-6">
              {hasFiltered ? (
                <DailyCalendar trades={filteredTrades} />
              ) : (
                <p className="text-text-muted text-center py-10">No trades for this account.</p>
              )}
            </div>
          </div>
        )}

        {/* Trades Tab */}
        {tab === 'trades' && hasTrades && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-text">Trade History</h1>
              <span className="text-sm text-text-muted">
                {selectedAccount === 'all' ? 'All Accounts' : selectedAccount}
              </span>
            </div>
            {hasFiltered ? (
              <TradesTable trades={filteredTrades} showAccount={selectedAccount === 'all' && accounts.length > 1} />
            ) : (
              <p className="text-text-muted text-center py-10">No trades for this account.</p>
            )}
          </div>
        )}

        {/* Empty state for non-upload tabs */}
        {tab !== 'upload' && !hasTrades && (
          <div className="text-center py-20">
            <Upload className="w-12 h-12 text-text-muted/30 mx-auto mb-4" />
            <p className="text-text-muted">No trades loaded. Upload a report first.</p>
            <button
              onClick={() => setTab('upload')}
              className="mt-4 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm hover:bg-primary/20 transition-colors"
            >
              Go to Upload
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
