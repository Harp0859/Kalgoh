import { useEffect, useState, useCallback } from 'react';
import { Link2, Loader2, RefreshCw, Trash2, CheckCircle, AlertCircle, Clock, Plus } from 'lucide-react';
import { listBrokerConnections, syncBrokerNow, disconnectBroker } from './api';
import ConnectBrokerDialog from './ConnectBrokerDialog';

function relativeTime(iso) {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (diff < 0) return 'just now';
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function StatusBadge({ status, lastError }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-profit bg-profit/10 rounded-md px-2 py-0.5">
        <CheckCircle className="w-3 h-3" />
        Active
      </span>
    );
  }
  if (status === 'provisioning') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-text-card-muted bg-card-lighter rounded-md px-2 py-0.5">
        <Clock className="w-3 h-3" />
        Provisioning
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-loss bg-loss/10 rounded-md px-2 py-0.5"
        title={lastError || 'Sync failed'}
      >
        <AlertCircle className="w-3 h-3" />
        Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-text-card-muted bg-card-lighter rounded-md px-2 py-0.5">
      Disabled
    </span>
  );
}

export default function BrokerStatus({ onDataChange }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState(null);
  const [disconnectingId, setDisconnectingId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [featureUnavailable, setFeatureUnavailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listBrokerConnections();
      setConnections(rows);
      setFeatureUnavailable(false);
    } catch (e) {
      console.error('Failed to load broker connections:', e);
      // If the table doesn't exist yet (migration not run), hide the feature entirely
      if (e.message?.includes('relation') || e.code === '42P01' || e.code === 'PGRST205') {
        setFeatureUnavailable(true);
      }
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Hide entirely if the migration hasn't been run
  if (featureUnavailable) return null;

  async function handleSync(conn) {
    setSyncingId(conn.id);
    try {
      await syncBrokerNow(conn.id);
      await load();
      onDataChange?.();
    } catch (e) {
      console.error('Sync failed:', e);
      alert(`Sync failed: ${e.message}`);
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDisconnect(conn) {
    if (!confirm(`Disconnect ${conn.accountName}? Synced trades will remain in your history, but new syncs will stop.`)) {
      return;
    }
    setDisconnectingId(conn.id);
    try {
      await disconnectBroker(conn.id);
      await load();
      onDataChange?.();
    } catch (e) {
      console.error('Disconnect failed:', e);
      alert(`Disconnect failed: ${e.message}`);
    } finally {
      setDisconnectingId(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <div className="bg-card rounded-3xl p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-card-lighter flex items-center justify-center">
              <Link2 className="w-4 h-4 text-text-card-muted" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-light">Connected brokers</h3>
              <p className="text-[11px] text-text-card-muted mt-0.5">
                Auto-syncs every 10 minutes &middot; MT4 &amp; MT5
              </p>
            </div>
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-profit bg-profit/10 hover:bg-profit/15 rounded-xl px-3.5 py-2 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Connect
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6 text-text-card-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : connections.length === 0 ? (
          <p className="text-xs text-text-card-muted py-2">
            No brokers connected yet. Add one to start syncing trade history automatically.
          </p>
        ) : (
          <div className="space-y-2">
            {connections.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between bg-card-lighter rounded-xl px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-light truncate">{c.accountName}</p>
                    <StatusBadge status={c.status} lastError={c.lastError} />
                  </div>
                  <p className="text-[11px] text-text-card-muted mt-0.5 truncate">
                    {c.platform.toUpperCase()} &middot; {c.server} &middot; #{c.login} &middot; synced {relativeTime(c.lastSyncAt)}
                  </p>
                  {c.status === 'error' && c.lastError && (
                    <p className="text-[11px] text-loss mt-1 truncate">{c.lastError}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <button
                    onClick={() => handleSync(c)}
                    disabled={syncingId === c.id || c.status === 'provisioning'}
                    className="p-2 rounded-lg text-text-card-muted hover:text-text-light hover:bg-card disabled:opacity-40"
                    title="Sync now"
                  >
                    {syncingId === c.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDisconnect(c)}
                    disabled={disconnectingId === c.id}
                    className="p-2 rounded-lg text-text-card-muted hover:text-loss hover:bg-loss/5 disabled:opacity-40"
                    title="Disconnect"
                  >
                    {disconnectingId === c.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConnectBrokerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConnected={() => {
          load();
          onDataChange?.();
        }}
      />
    </div>
  );
}
