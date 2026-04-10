// metaapi-sync
// Pulls historical trades + metrics from MetaStats for one or more
// broker_connections and upserts them into the trades / balance_ops tables.
//
// Invoked two ways:
//   1. pg_cron (every 10 minutes) — body: {"source":"cron"}, processes every
//      active connection across all users.
//   2. UI "Sync now" button — body: {"connectionId": 123}, processes a single
//      connection and requires a user JWT.

// deno-lint-ignore-file no-explicit-any
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0';
import { corsHeaders, handleCorsPreflight, json } from '../_shared/cors.ts';
import {
  getAccountTrades,
  getMetrics,
  mapBalanceOp,
  mapTradeToRow,
  deployAccount,
  undeployAccount,
  waitUntilConnected,
} from '../_shared/metaapi.ts';

// Sync looks back this many hours beyond last_sync_at to catch any trades
// whose close_time was updated after the initial sync (e.g. late settlement).
const OVERLAP_HOURS = 6;

// First-time sync pulls this many years of history. MetaStats caps at
// whatever the broker kept; we just ask for a lot.
const FIRST_SYNC_YEARS = 5;

Deno.serve(async (req) => {
  const pre = handleCorsPreflight(req);
  if (pre) return pre;

  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const metaapiToken = Deno.env.get('METAAPI_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!metaapiToken || !supabaseUrl || !serviceKey) {
    return json({ error: 'server not configured' }, 500);
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is fine; treat as cron.
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Determine which connections to sync.
  let connectionsQuery = admin
    .from('broker_connections')
    .select('*')
    .eq('status', 'active');

  if (body?.connectionId) {
    // Single-connection sync: must be authenticated as the owning user
    // (so UI users can't poke other people's connections).
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'missing auth' }, 401);

    const userClient = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: 'invalid auth' }, 401);

    connectionsQuery = connectionsQuery
      .eq('id', body.connectionId)
      .eq('user_id', userData.user.id);
  } else {
    // Cron-mode: require the shared service JWT (Supabase automatically does
    // this when invoked with the Authorization: Bearer <service_role> header
    // set via pg_net, but we also verify the caller isn't anonymous).
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.includes(serviceKey)) {
      return json({ error: 'forbidden' }, 403);
    }
  }

  const { data: connections, error: connErr } = await connectionsQuery;
  if (connErr) return json({ error: connErr.message }, 500);
  if (!connections || connections.length === 0) {
    return json({ synced: 0, results: [] });
  }

  const results: Array<{
    connectionId: number;
    account: string;
    ok: boolean;
    newTrades?: number;
    newBalanceOps?: number;
    error?: string;
  }> = [];

  for (const conn of connections) {
    try {
      const summary = await syncOne(admin, metaapiToken, conn);
      results.push({
        connectionId: conn.id,
        account: conn.account_name,
        ok: true,
        ...summary,
      });
    } catch (e) {
      const msg = (e as Error).message;
      await admin
        .from('broker_connections')
        .update({
          status: 'error',
          last_error: msg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conn.id);
      results.push({
        connectionId: conn.id,
        account: conn.account_name,
        ok: false,
        error: msg,
      });
    }
  }

  return json({ synced: results.filter((r) => r.ok).length, results });
});

async function syncOne(
  admin: SupabaseClient,
  token: string,
  conn: any,
): Promise<{ newTrades: number; newBalanceOps: number }> {
  if (!conn.metaapi_account_id) {
    throw new Error('connection has no metaapi_account_id');
  }

  const now = new Date();

  // Start window: last_sync_at minus overlap, OR FIRST_SYNC_YEARS ago.
  let startDate: Date;
  if (conn.last_sync_at) {
    startDate = new Date(conn.last_sync_at);
    startDate.setHours(startDate.getHours() - OVERLAP_HOURS);
  } else {
    startDate = new Date(now);
    startDate.setFullYear(now.getFullYear() - FIRST_SYNC_YEARS);
  }

  const startIso = startDate.toISOString();
  const endIso = now.toISOString();

  // 0. Deploy the account (idempotent — no-op if already deployed).
  //    This is the cost-saving step: between syncs, accounts sit in the
  //    UNDEPLOYED state at $0.00105/hr instead of $0.0126/hr deployed.
  await deployAccount(token, conn.metaapi_account_id);
  await waitUntilConnected(token, conn.metaapi_account_id);

  try {
    // 1. Fetch metrics (side effect: triggers MetaStats to refresh its cached
    //    history for this account, which makes the trades call return fresh
    //    data without needing `updateHistory=true`).
    const metrics = await getMetrics(token, conn.metaapi_account_id);

    // 2. Fetch trades since the window start.
    const trades = await getAccountTrades(
      token,
      conn.metaapi_account_id,
      startIso,
      endIso,
    );

  // 3. Map into our schema.
  const tradeRows: any[] = [];
  const balanceOps: any[] = [];
  for (const t of trades) {
    const row = mapTradeToRow(t, conn.user_id, conn.account_name);
    if (row) {
      tradeRows.push(row);
      continue;
    }
    const op = mapBalanceOp(t, conn.user_id, conn.account_name);
    if (op) balanceOps.push(op);
  }

  // 4. Upsert trades using the existing unique index
  //    (user_id, account, ticket, close_time).
  let newTrades = 0;
  if (tradeRows.length > 0) {
    const { error, count } = await admin
      .from('trades')
      .upsert(tradeRows, {
        onConflict: 'user_id,account,ticket,close_time',
        ignoreDuplicates: true,
        count: 'exact',
      });
    if (error) throw new Error(`trades upsert failed: ${error.message}`);
    newTrades = count ?? 0;
  }

  // 5. Upsert balance ops on (user_id, account, time, amount).
  let newBalanceOps = 0;
  if (balanceOps.length > 0) {
    const { error, count } = await admin
      .from('balance_ops')
      .upsert(balanceOps, {
        onConflict: 'user_id,account,time,amount',
        ignoreDuplicates: true,
        count: 'exact',
      });
    if (error) throw new Error(`balance_ops upsert failed: ${error.message}`);
    newBalanceOps = count ?? 0;
  }

    // 6. Starting balance = amount of the FIRST balance op (the initial
    //    deposit), not metrics.deposits (which is sum of all deposits over
    //    time). Query what we just inserted to get the earliest one.
    const { data: firstOp } = await admin
      .from('balance_ops')
      .select('amount')
      .eq('user_id', conn.user_id)
      .eq('account', conn.account_name)
      .order('time', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstOp && Number(firstOp.amount) > 0) {
      const key = `startingBalance_${conn.account_name}`;
      const { data: existing } = await admin
        .from('settings')
        .select('value')
        .eq('user_id', conn.user_id)
        .eq('key', key)
        .maybeSingle();
      if (!existing || !existing.value) {
        await admin.from('settings').upsert(
          {
            user_id: conn.user_id,
            key,
            value: Number(firstOp.amount),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,key' },
        );
      }
    }

    // 7. Mark the connection as freshly synced.
    await admin
      .from('broker_connections')
      .update({
        status: 'active',
        last_sync_at: endIso,
        last_error: null,
        updated_at: endIso,
      })
      .eq('id', conn.id);

    return { newTrades, newBalanceOps };
  } finally {
    // 8. Always undeploy — even on failure — to keep costs low.
    //    Swallow errors here so we don't mask the original sync error.
    try {
      await undeployAccount(token, conn.metaapi_account_id);
    } catch { /* noop */ }
  }
}
