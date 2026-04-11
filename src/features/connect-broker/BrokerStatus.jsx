import { useEffect, useState, useCallback } from 'react';
import { Link2, Loader2, RefreshCw, Trash2, CheckCircle, AlertCircle, Clock, Plus } from 'lucide-react';
import { listBrokerConnections, syncBrokerNow, disconnectBroker } from './api';
import ConnectBrokerDialog from './ConnectBrokerDialog';

// Turn a raw sync error into a short, user-friendly line. Unknown
// errors fall back to the raw text so we don't hide information.
function friendlySyncError(raw) {
  if (!raw || typeof raw !== 'string') return 'Sync failed. Try again in a moment.';
  const lower = raw.toLowerCase();
  if (lower.includes('account not ready') || lower.includes('state=deploying')) {
    return 'Still deploying on MetaApi (first sync can take up to 5 minutes). Hit Sync again in a minute.';
  }
  if (lower.includes('e_auth') || lower.includes('failed to authenticate')) {
    return "Couldn't sign in to your broker. Verify the login, investor password, and server name in the terminal.";
  }
  if (lower.includes('e_srv_not_found') || lower.includes('server is not supported')) {
    return 'Server name not recognised by MetaApi. Disconnect this account and re-add it using the broker picker.';
  }
  if (lower.includes('429') || lower.includes('too many')) {
    return 'MetaApi is rate-limiting this account. Wait a minute and try again.';
  }
  if (lower.includes('network') || lower.includes('fetch failed')) {
    return "Network error reaching MetaApi. Check your connection and retry.";
  }
  return raw.length < 140 ? raw : raw.slice(0, 140) + '…';
}

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
  // Uppercase tracking labels — [11px] is the minimum safe size.
  const base = 'inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide rounded-md px-2 py-0.5';
  if (status === 'active') {
    return (
      <span className={`${base} text-profit bg-profit/10`} role="status">
        <CheckCircle className="w-3 h-3" aria-hidden="true" />
        Active
      </span>
    );
  }
  if (status === 'provisioning') {
    return (
      <span className={`${base} text-text-card-muted bg-card-lighter`} role="status">
        <Clock className="w-3 h-3" aria-hidden="true" />
        Provisioning
      </span>
    );
  }
  if (status === 'syncing') {
    return (
      <span className={`${base} text-accent-blue bg-accent-blue/10`} role="status">
        <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
        Syncing
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span
        className={`${base} text-loss bg-loss/10`}
        title={lastError || 'Sync failed'}
        role="status"
      >
        <AlertCircle className="w-3 h-3" aria-hidden="true" />
        Error
      </span>
    );
  }
  return (
    <span className={`${base} text-text-card-muted bg-card-lighter`} role="status">
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
      <div className="card-premium bg-card rounded-3xl p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-card-lighter flex items-center justify-center shrink-0">
              <Link2 className="w-4 h-4 text-text-card-muted" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-text-light">Connected brokers</h3>
              <p className="text-xs text-text-card-muted mt-0.5 truncate">
                Auto-syncs every 10 minutes &middot; MT4 &amp; MT5
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            aria-label="Connect a new broker"
            className="min-h-[44px] flex items-center gap-1.5 text-xs font-medium text-profit bg-profit/10 hover:bg-profit/15 rounded-xl px-4 py-3 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Connect
          </button>
        </div>

        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading broker connections">
            {[0, 1].map((i) => (
              <div key={i} className="bg-card-lighter/60 rounded-xl px-4 py-3 animate-skeleton">
                <div className="h-3 w-32 bg-card-light rounded mb-2" />
                <div className="h-2.5 w-48 bg-card-light rounded" />
              </div>
            ))}
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
                className="flex items-center justify-between bg-card-lighter rounded-xl px-4 py-3 gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-text-light truncate">{c.accountName}</p>
                    <StatusBadge status={c.status} lastError={c.lastError} />
                  </div>
                  <p className="text-xs text-text-card-muted mt-0.5 truncate tabular-nums">
                    {c.platform.toUpperCase()} &middot; {c.server} &middot; #{c.login} &middot; synced {relativeTime(c.lastSyncAt)}
                  </p>
                  {c.status === 'error' && c.lastError && (
                    <p className="text-xs text-loss mt-1 leading-relaxed" title={c.lastError}>
                      {friendlySyncError(c.lastError)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-1 shrink-0">
                  {(() => {
                    // A row in 'syncing' is only actually in-flight if we
                    // started the sync from this browser session (tracked
                    // via syncingId). Otherwise it's a stale lock from a
                    // crashed edge function run, and the user needs to be
                    // able to retry it. Similarly, a 'syncing' row whose
                    // updated_at is more than 5 minutes old is stale — the
                    // atomic lock in the edge function already treats
                    // those as reclaimable.
                    const inFlight = syncingId === c.id;
                    const staleLock =
                      c.status === 'syncing' &&
                      c.updatedAt &&
                      Date.now() - new Date(c.updatedAt).getTime() > 5 * 60 * 1000;
                    const blockSync =
                      inFlight ||
                      c.status === 'provisioning' ||
                      (c.status === 'syncing' && !staleLock);
                    return (
                  <button
                    type="button"
                    onClick={() => handleSync(c)}
                    disabled={blockSync}
                    className="w-10 h-10 flex items-center justify-center rounded-xl text-text-card-muted hover:text-text-light hover:bg-card disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card transition-colors"
                    aria-label={`Sync ${c.accountName} now`}
                    title={staleLock ? 'Sync appears stuck — click to retry' : 'Sync now'}
                  >
                    {syncingId === c.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <RefreshCw className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => handleDisconnect(c)}
                    disabled={disconnectingId === c.id}
                    className="w-10 h-10 flex items-center justify-center rounded-xl text-text-card-muted hover:text-loss hover:bg-loss/5 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-loss/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card transition-colors"
                    aria-label={`Disconnect ${c.accountName}`}
                    title="Disconnect"
                  >
                    {disconnectingId === c.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
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
