// metaapi-brokers
// Returns a map of broker names -> array of server names by probing the
// MetaApi provisioning API. MetaApi has no dedicated "list brokers" endpoint;
// instead, POSTing an invalid server to /users/current/accounts returns a
// 400 ValidationError whose body contains up to ~10 brokers matching the
// server-name prefix in `details.serversByBrokers`.
//
// We probe with one user-supplied prefix, or — when no query is given —
// sweep across a set of common starting letters and merge the results
// into a single deduped list.
//
// The sweep is SEQUENTIAL with a small delay between requests. MetaApi's
// provisioning API tracks "failed broker detection" attempts and will start
// returning 429 TooManyRequestsError (with a ~1 hour cool-off) if we hammer
// it in parallel. Sequential + spaced requests keeps us under that limit.
//
// Response shape:
//   { brokers: { [brokerName: string]: string[] }, cached: boolean }
//
// Cached per-user (no-query variant only) in the `settings` table under
// key `metaapi_brokers_cache` for 7 days. Pass `{ force: true }` to bypass.
// If any probe fails (rate limit, network error, etc.) we still return the
// partial result but DO NOT overwrite a good existing cache.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0';
import { handleCorsPreflight, json } from '../_shared/cors.ts';

const PROVISIONING_BASE =
  'https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai';

// Letters we sweep when building the full broker index. Covers the vast
// majority of real broker names; missing letters (j/k/n/o/q/u/w/y/z) are
// rare enough that we skip them to keep the sweep short.
const PROBE_LETTERS = [
  'a', 'b', 'c', 'e', 'f', 'g', 'h', 'i',
  'l', 'm', 'p', 'r', 's', 't', 'v', 'x',
];

// Delay between sequential probes. Found by trial and error: anything under
// ~200ms bursts hard enough to trip MetaApi's rate limiter.
const PROBE_DELAY_MS = 400;

const CACHE_KEY = 'metaapi_brokers_cache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type BrokersMap = Record<string, string[]>;

interface CacheValue {
  brokers: BrokersMap;
  cached_at: string;
}

interface ProbeResult {
  map: BrokersMap;
  ok: boolean;       // true if we got a usable E_SRV_NOT_FOUND response
  error?: string;    // diagnostic string for failures
  rateLimited?: boolean;
}

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

  // Auth — same pattern as metaapi-sync/metaapi-provision.
  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'missing auth' }, 401);

  const userClient = createClient(supabaseUrl, serviceKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ error: 'invalid auth' }, 401);
  const userId = userData.user.id;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is OK — treat as full sweep.
  }

  const rawQuery = typeof body?.query === 'string' ? body.query.trim() : '';
  const force = body?.force === true;
  const useCache = !rawQuery && !force;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // 1. Cache lookup (only for the no-query, un-forced path).
  if (useCache) {
    const { data: cached } = await admin
      .from('settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', CACHE_KEY)
      .maybeSingle();
    const value = cached?.value as CacheValue | null | undefined;
    if (value?.brokers && value?.cached_at) {
      const age = Date.now() - new Date(value.cached_at).getTime();
      if (age >= 0 && age < CACHE_TTL_MS) {
        return json({ brokers: value.brokers, cached: true });
      }
    }
  }

  // 2. Probe. Single prefix, or sequential sweep across common letters.
  let brokers: BrokersMap = {};
  let sweepComplete = true;
  const failures: string[] = [];

  if (rawQuery && rawQuery.length >= 2) {
    const r = await probe(metaapiToken, rawQuery);
    if (!r.ok) {
      return json(
        { error: r.error || 'probe failed', rateLimited: r.rateLimited },
        r.rateLimited ? 429 : 502,
      );
    }
    brokers = r.map;
  } else {
    for (let i = 0; i < PROBE_LETTERS.length; i++) {
      const letter = PROBE_LETTERS[i];
      const r = await probe(metaapiToken, letter);
      if (r.ok) {
        mergeInto(brokers, r.map);
      } else {
        sweepComplete = false;
        failures.push(`${letter}:${r.error || 'unknown'}`);
        console.log(`probe("${letter}") failed: ${r.error}`);
        // If we hit a rate limit, further probes will also fail — stop
        // hammering the API.
        if (r.rateLimited) break;
      }
      // Small breather between probes so MetaApi doesn't flag us.
      if (i < PROBE_LETTERS.length - 1) {
        await new Promise((res) => setTimeout(res, PROBE_DELAY_MS));
      }
    }
  }

  // 3. Normalize: sort server lists, sort brokers alphabetically.
  const sorted: BrokersMap = {};
  for (const name of Object.keys(brokers).sort((a, b) => a.localeCompare(b))) {
    sorted[name] = Array.from(new Set(brokers[name])).sort((a, b) =>
      a.localeCompare(b),
    );
  }

  // 4. Persist cache only for the full-sweep path AND only if the sweep
  //    completed cleanly. Partial results can still be returned to the
  //    caller, but we don't want to overwrite a good cache with them.
  if (!rawQuery && sweepComplete) {
    const payload: CacheValue = {
      brokers: sorted,
      cached_at: new Date().toISOString(),
    };
    await admin.from('settings').upsert(
      {
        user_id: userId,
        key: CACHE_KEY,
        value: payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,key' },
    );
  }

  return json({
    brokers: sorted,
    cached: false,
    sweepComplete,
    ...(failures.length ? { failures } : {}),
  });
});

// ---------------------------------------------------------------------------
// Probe helper
// ---------------------------------------------------------------------------

// Posts an invalid-server account-creation payload to MetaApi and parses the
// resulting 400 ValidationError for the `serversByBrokers` hint. MetaApi
// returns up to ~10 brokers whose server names start with the given prefix.
async function probe(token: string, server: string): Promise<ProbeResult> {
  const payload = {
    name: 'kalgoh-broker-probe',
    type: 'cloud-g2',
    login: '0',
    password: 'probe',
    server,
    platform: 'mt5',
    magic: 0,
    application: 'MetaApi',
  };

  let res: Response;
  try {
    res = await fetch(`${PROVISIONING_BASE}/users/current/accounts`, {
      method: 'POST',
      headers: {
        'auth-token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return { map: {}, ok: false, error: `fetch: ${(e as Error).message}` };
  }

  // Unlikely but possible — if MetaApi accepts the payload, delete the
  // ghost account immediately so we don't leak paid resources.
  if (res.status === 201) {
    try {
      const created = await res.json();
      if (created?.id) {
        await fetch(
          `${PROVISIONING_BASE}/users/current/accounts/${created.id}`,
          { method: 'DELETE', headers: { 'auth-token': token } },
        );
      }
    } catch { /* noop */ }
    return { map: {}, ok: false, error: 'unexpected 201' };
  }

  if (res.status === 429) {
    // Drain the body so the connection releases, but flag rate limiting.
    try { await res.json(); } catch { /* noop */ }
    return { map: {}, ok: false, error: '429 rate limited', rateLimited: true };
  }

  let parsed: any = null;
  try {
    parsed = await res.json();
  } catch {
    return { map: {}, ok: false, error: `parse error (status=${res.status})` };
  }

  const code = parsed?.details?.code;
  if (code !== 'E_SRV_NOT_FOUND') {
    return {
      map: {},
      ok: false,
      error: `status=${res.status} code=${code ?? 'none'}`,
    };
  }

  const srvMap = parsed?.details?.serversByBrokers;
  if (!srvMap || typeof srvMap !== 'object') {
    // E_SRV_NOT_FOUND with no hint list is still a "successful" probe —
    // MetaApi just has nothing to suggest.
    return { map: {}, ok: true };
  }

  const out: BrokersMap = {};
  for (const [broker, servers] of Object.entries(srvMap)) {
    if (Array.isArray(servers)) {
      out[broker] = (servers as unknown[])
        .filter((s): s is string => typeof s === 'string');
    }
  }
  return { map: out, ok: true };
}

function mergeInto(dest: BrokersMap, src: BrokersMap): void {
  for (const [broker, servers] of Object.entries(src)) {
    if (!dest[broker]) dest[broker] = [];
    dest[broker].push(...servers);
  }
}
