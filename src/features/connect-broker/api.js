import { supabase } from '../../db/supabase';

// Thin wrappers around the two edge functions plus a direct table read for
// the list of connected brokers.

export async function listBrokerConnections() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('broker_connections')
    .select('id, account_name, platform, server, login, status, last_sync_at, last_error, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((c) => ({
    id: c.id,
    accountName: c.account_name,
    platform: c.platform,
    server: c.server,
    login: c.login,
    status: c.status,
    lastSyncAt: c.last_sync_at,
    lastError: c.last_error,
    createdAt: c.created_at,
  }));
}

async function unwrapEdgeError(error) {
  let message = error.message;
  try {
    const ctx = error.context;
    if (ctx && typeof ctx.json === 'function') {
      const j = await ctx.json();
      if (j?.error) message = j.error;
    }
  } catch { /* noop */ }
  const lower = message?.toLowerCase() || '';
  // Friendlier messages for common setup issues
  if (lower.includes('failed to send a request') || lower.includes('function not found')) {
    return 'Broker sync is not set up yet. Deploy the Supabase edge functions (see SUPABASE_SETUP.md).';
  }
  if (lower.includes('server not configured')) {
    return 'MetaApi token is not configured. Set METAAPI_TOKEN in Supabase secrets to enable broker sync.';
  }
  if (lower.includes('encrypt_investor_password') || lower.includes('kalgoh_broker_key')) {
    return 'Broker encryption is not set up. Run supabase/migrations/20260410_broker_connections.sql in the SQL editor.';
  }
  return message;
}

export async function fetchBrokers(query) {
  const body = {};
  if (typeof query === 'string' && query.length > 0) body.query = query;
  const { data, error } = await supabase.functions.invoke('metaapi-brokers', {
    body,
  });
  if (error) throw new Error(await unwrapEdgeError(error));
  return data?.brokers || {};
}

export async function connectBroker({ platform, login, investorPassword, server, nickname }) {
  const { data, error } = await supabase.functions.invoke('metaapi-provision', {
    body: { platform, login, investorPassword, server, nickname },
  });
  if (error) throw new Error(await unwrapEdgeError(error));
  return data;
}

export async function syncBrokerNow(connectionId) {
  const { data, error } = await supabase.functions.invoke('metaapi-sync', {
    body: { connectionId },
  });
  if (error) throw new Error(await unwrapEdgeError(error));
  return data;
}

export async function disconnectBroker(connectionId) {
  const { error } = await supabase
    .from('broker_connections')
    .delete()
    .eq('id', connectionId);
  if (error) throw error;
}
