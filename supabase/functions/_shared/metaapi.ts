// Shared MetaApi / MetaStats helpers used by the provision + sync edge functions.
//
// These thin wrappers hit the REST APIs directly (no SDK) to keep cold start
// small and avoid bundling npm packages into Deno edge functions.

const PROVISIONING_BASE = 'https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai';
const METASTATS_BASE = 'https://metastats-api-v1.london.agiliumtrade.ai';

export interface ProvisionAccountInput {
  name: string;            // user-facing nickname
  type: 'cloud-g1' | 'cloud-g2';
  login: string;
  password: string;        // investor (read-only) password
  server: string;
  platform: 'mt4' | 'mt5';
  magic?: number;
  application?: string;
}

export interface ProvisionedAccount {
  id: string;
  state: string;
  connectionStatus?: string;
}

async function metaapiFetch(
  base: string,
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = `${base}${path}`;
  const headers = new Headers(init.headers || {});
  headers.set('auth-token', token);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...init, headers });
}

export async function provisionAccount(
  token: string,
  input: ProvisionAccountInput,
): Promise<ProvisionedAccount> {
  const body = {
    name: input.name,
    type: input.type,
    login: input.login,
    password: input.password,   // investor (read-only) password
    server: input.server,
    platform: input.platform,
    magic: input.magic ?? 0,
    application: input.application ?? 'MetaApi',
    metastatsApiEnabled: true,
    riskManagementApiEnabled: false,
    copyFactoryRoles: [],
  };

  const res = await metaapiFetch(
    PROVISIONING_BASE,
    '/users/current/accounts',
    token,
    { method: 'POST', body: JSON.stringify(body) },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MetaApi provisionAccount failed: ${res.status} ${text}`);
  }
  return await res.json();
}

export async function deployAccount(token: string, accountId: string): Promise<void> {
  const res = await metaapiFetch(
    PROVISIONING_BASE,
    `/users/current/accounts/${accountId}/deploy`,
    token,
    { method: 'POST' },
  );
  // Deploy is idempotent — DEPLOYED state returns 204; already deployed is fine.
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    // Don't fail on "already deployed" style errors.
    if (res.status === 409) return;
    throw new Error(`MetaApi deployAccount failed: ${res.status} ${text}`);
  }
}

export async function getAccountState(
  token: string,
  accountId: string,
): Promise<{ state: string; connectionStatus?: string }> {
  const res = await metaapiFetch(
    PROVISIONING_BASE,
    `/users/current/accounts/${accountId}`,
    token,
  );
  if (!res.ok) {
    throw new Error(`MetaApi getAccountState failed: ${res.status}`);
  }
  return await res.json();
}

export async function undeployAccount(token: string, accountId: string): Promise<void> {
  const res = await metaapiFetch(
    PROVISIONING_BASE,
    `/users/current/accounts/${accountId}/undeploy`,
    token,
    { method: 'POST' },
  );
  // 204 = undeployed, 409 = already undeployed
  if (!res.ok && res.status !== 204 && res.status !== 409) {
    const text = await res.text();
    throw new Error(`MetaApi undeployAccount failed: ${res.status} ${text}`);
  }
}

// Wait until the account is DEPLOYED + CONNECTED to the broker.
// MetaStats requires an active broker connection, not just a deployed terminal,
// so we poll until connectionStatus === 'CONNECTED'.
//
// First-time deploys for some brokers (Vantage, IC Markets with unusual
// server names, etc.) routinely take 3-4 minutes because MetaApi has to
// spin up a fresh terminal AND complete a broker auth handshake on a
// cold cache. A 120s deadline was too tight and produced false failures
// on accounts that were actually fine. 240s is a better default.
//
// Polls every 3s up to maxMs. Returns the final state on success.
export async function waitUntilConnected(
  token: string,
  accountId: string,
  maxMs = 240000,
): Promise<{ state: string; connectionStatus?: string }> {
  const deadline = Date.now() + maxMs;
  let last: { state: string; connectionStatus?: string } = { state: 'UNKNOWN' };
  while (Date.now() < deadline) {
    last = await getAccountState(token, accountId);
    if (last.state === 'DEPLOYED' && last.connectionStatus === 'CONNECTED') {
      return last;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  // Emit a descriptive message that the frontend can pattern-match on to
  // show a friendlier "still deploying, try again in a minute" banner.
  throw new Error(
    `Account not ready within ${Math.round(maxMs / 1000)}s. ` +
      `state=${last.state} connectionStatus=${last.connectionStatus || '-'}. ` +
      `First-time broker deploys can take up to 5 minutes — the account is saved, ` +
      `try syncing again from the brokers list in a minute.`,
  );
}

export async function deleteAccount(token: string, accountId: string): Promise<void> {
  const res = await metaapiFetch(
    PROVISIONING_BASE,
    `/users/current/accounts/${accountId}`,
    token,
    { method: 'DELETE' },
  );
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const text = await res.text();
    throw new Error(`MetaApi deleteAccount failed: ${res.status} ${text}`);
  }
}

// ============================================================================
// MetaStats
// ============================================================================

export interface MetaStatsTrade {
  _id?: string;
  accountId?: string;
  openTime?: string;
  closeTime?: string;
  type?: string; // e.g. 'DEAL_TYPE_BUY', 'DEAL_TYPE_SELL', 'DEAL_TYPE_BALANCE'
  symbol?: string;
  volume?: number;
  openPrice?: number;
  closePrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  commission?: number;
  swap?: number;
  profit?: number;
  gain?: number;
  pips?: number;
  comment?: string;
  brokerComment?: string;
  magic?: number;
  platform?: string;
  durationInMinutes?: number;
  marketValue?: number;
}

export interface MetaStatsMetrics {
  trades?: number;
  wonTrades?: number;
  lostTrades?: number;
  balance?: number;
  equity?: number;
  deposits?: number;
  profit?: number;
  // There are many more fields — we pull just what we need.
  [k: string]: unknown;
}

// Retry wrapper for MetaStats calls. MetaStats frequently returns 500/502/504
// while the terminal is still warming up — even after provisioning reports
// connectionStatus=CONNECTED, the historical data pipeline takes another
// 10-30 seconds to populate. Retrying with backoff fixes this transparently.
async function retry<T>(fn: () => Promise<T>, attempts = 5, baseMs = 5000): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = (e as Error).message || '';
      // Only retry on transient server errors from MetaStats.
      const retryable = /\b(500|502|503|504|408)\b/.test(msg) ||
                        /not connected to broker/i.test(msg) ||
                        /TimeoutError/i.test(msg);
      if (!retryable || i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, baseMs * (i + 1)));
    }
  }
  throw lastErr;
}

export async function getMetrics(
  token: string,
  accountId: string,
): Promise<MetaStatsMetrics> {
  return await retry(async () => {
    const res = await metaapiFetch(
      METASTATS_BASE,
      `/users/current/accounts/${accountId}/metrics?includeOpenPositions=false`,
      token,
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`MetaStats getMetrics failed: ${res.status} ${text}`);
    }
    const body = await res.json();
    return body.metrics || body;
  });
}

export async function getAccountTrades(
  token: string,
  accountId: string,
  startIso: string,
  endIso: string,
): Promise<MetaStatsTrade[]> {
  // MetaStats expects "YYYY-MM-DD HH:mm:ss.SSS" format, space-separated.
  const fmt = (iso: string) =>
    iso.replace('T', ' ').replace('Z', '').slice(0, 23).padEnd(23, '0');

  // updateHistory=true requires a deployed terminal; we deploy before calling
  // this in the sync function, but as a safety net default to false.
  const url =
    `/users/current/accounts/${accountId}/historical-trades/` +
    `${encodeURIComponent(fmt(startIso))}/${encodeURIComponent(fmt(endIso))}`;

  return await retry(async () => {
    const res = await metaapiFetch(METASTATS_BASE, url, token);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`MetaStats getAccountTrades failed: ${res.status} ${text}`);
    }
    const body = await res.json();
    return body.trades || body || [];
  });
}

// ============================================================================
// Field mapping: MetaStats trade -> app's `trades` table row shape
// ============================================================================

// Normalizes MetaStats deal type strings to the plain 'buy' / 'sell' / etc
// that match what parseFile.js writes for manually uploaded trades.
function normalizeType(t?: string): string {
  if (!t) return '';
  const s = t.toLowerCase();
  if (s.includes('balance')) return 'balance';
  if (s.includes('credit')) return 'credit';
  if (s.includes('buy')) return 'buy';
  if (s.includes('sell')) return 'sell';
  return s.replace(/^deal_type_/, '');
}

// MetaStats returns timestamps in broker server time, formatted like
// "2026-04-10 14:24:11.979" with no timezone indicator. We treat this
// as the canonical wall-clock time and store it verbatim (by tagging
// it as UTC) so Postgres doesn't try to convert it. This matches how
// MT5 displays the same trade and keeps the whole stack timezone-free.
function wallClockIso(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Already has a timezone? Keep as-is (shouldn't happen for MetaStats,
  // but safe for forward compat).
  if (/[Zz]$/.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed)) return trimmed;
  // "2026-04-10 14:24:11.979" -> "2026-04-10T14:24:11.979Z"
  return trimmed.replace(' ', 'T') + 'Z';
}

export function mapTradeToRow(
  trade: MetaStatsTrade,
  userId: string,
  accountName: string,
): Record<string, unknown> | null {
  const type = normalizeType(trade.type);
  // Balance / credit / deposit rows are handled separately by mapBalanceOp.
  if (!type || type === 'balance' || type === 'credit') return null;

  // Must have a close time to fit our dedup index (user_id, account, ticket, close_time).
  if (!trade.closeTime) return null;

  return {
    user_id: userId,
    upload_id: null,
    account: accountName,
    ticket: trade._id ?? '',
    open_time: wallClockIso(trade.openTime),
    close_time: wallClockIso(trade.closeTime),
    type,
    symbol: trade.symbol ?? '',
    volume: trade.volume ?? 0,
    open_price: trade.openPrice ?? 0,
    close_price: trade.closePrice ?? 0,
    sl: trade.stopLoss ?? 0,
    tp: trade.takeProfit ?? 0,
    commission: trade.commission ?? 0,
    swap: trade.swap ?? 0,
    profit: trade.profit ?? 0,
    comment: trade.comment || trade.brokerComment || '',
  };
}

export interface BalanceOpRow {
  user_id: string;
  account: string;
  time: string;
  amount: number;
  balance_after: number | null;
  comment: string;
}

export function mapBalanceOp(
  trade: MetaStatsTrade,
  userId: string,
  accountName: string,
): BalanceOpRow | null {
  const type = normalizeType(trade.type);
  if (type !== 'balance' && type !== 'credit') return null;
  const time = wallClockIso(trade.closeTime || trade.openTime);
  if (!time) return null;

  return {
    user_id: userId,
    account: accountName,
    time,
    amount: trade.profit ?? 0,
    balance_after: null,
    comment: trade.comment || trade.brokerComment || '',
  };
}

export function regionBase(region: 'london' = 'london'): {
  provisioning: string;
  metastats: string;
} {
  // Exposed for testability; currently we hardcode london.
  void region;
  return { provisioning: PROVISIONING_BASE, metastats: METASTATS_BASE };
}
