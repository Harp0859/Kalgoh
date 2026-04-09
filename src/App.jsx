import { useState, useEffect, useCallback } from 'react';
import { Upload, BarChart3, Calendar, Table2, LayoutDashboard } from 'lucide-react';
import FileUpload from './components/FileUpload';
import UploadHistory from './components/UploadHistory';
import TradesTable from './components/TradesTable';
import DailyCalendar from './components/DailyCalendar';
import Dashboard from './components/Dashboard';
import { getAllTrades } from './db/database';

const TABS = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'trades', label: 'Trades', icon: Table2 },
];

function App() {
  const [tab, setTab] = useState('upload');
  const [trades, setTrades] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadTrades = useCallback(async () => {
    setLoading(true);
    const data = await getAllTrades();
    setTrades(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTrades();
  }, [loadTrades, refreshKey]);

  function onUploadComplete() {
    setRefreshKey((k) => k + 1);
  }

  function onDataChange() {
    setRefreshKey((k) => k + 1);
  }

  const hasTrades = trades.length > 0;

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
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Upload Tab */}
        {tab === 'upload' && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-text">Import Trading Data</h1>
              <p className="text-sm text-text-muted mt-1">Upload your MT5 trade history report to get started</p>
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
            <h1 className="text-2xl font-bold text-text mb-6">Trading Dashboard</h1>
            <Dashboard trades={trades} />
          </div>
        )}

        {/* Calendar Tab */}
        {tab === 'calendar' && hasTrades && (
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-text mb-6">Daily Calendar</h1>
            <div className="bg-surface rounded-xl border border-border p-6">
              <DailyCalendar trades={trades} />
            </div>
          </div>
        )}

        {/* Trades Tab */}
        {tab === 'trades' && hasTrades && (
          <div>
            <h1 className="text-2xl font-bold text-text mb-6">Trade History</h1>
            <TradesTable trades={trades} />
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
