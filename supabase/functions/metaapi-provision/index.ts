// metaapi-provision
// Creates a new MetaApi account (MT4 or MT5) using the user's investor
// password, deploys it, and stores a broker_connections row for the app.
//
// Called from the Connect Broker dialog in the frontend.
//
// Request body:
//   {
//     platform: 'mt4' | 'mt5',
//     login: string,
//     investorPassword: string,
//     server: string,
//     nickname: string
//   }
//
// Response:
//   { connectionId: number, metaapiAccountId: string, status: string }

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0';
import { corsHeaders, handleCorsPreflight, json } from '../_shared/cors.ts';
import {
  provisionAccount,
  deployAccount,
  deleteAccount,
  undeployAccount,
} from '../_shared/metaapi.ts';

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

  // Authenticate the caller using their user JWT. We still use the service
  // role key for DB writes (to get past the "no client inserts" RLS rule),
  // but we MUST identify the real user so we write their row.
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json body' }, 400);
  }

  const { platform, login, investorPassword, server, nickname } = body ?? {};
  if (
    !platform ||
    !['mt4', 'mt5'].includes(platform) ||
    !login ||
    !investorPassword ||
    !server ||
    !nickname
  ) {
    return json({ error: 'missing required fields' }, 400);
  }

  // Admin client that bypasses RLS for the writes below.
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Reject duplicate nicknames for this user up front so we don't spend a
  // MetaApi provisioning call on something that'll fail the unique index.
  const { data: existing } = await admin
    .from('broker_connections')
    .select('id')
    .eq('user_id', userId)
    .eq('account_name', nickname)
    .maybeSingle();
  if (existing) {
    return json(
      { error: `An account named "${nickname}" already exists.` },
      409,
    );
  }

  // 1. Encrypt the investor password using the pgsodium helper so we never
  //    hold plaintext in the broker_connections row.
  const { data: cipher, error: encErr } = await admin.rpc(
    'encrypt_investor_password',
    { plain: investorPassword },
  );
  if (encErr) {
    return json({ error: `encrypt failed: ${encErr.message}` }, 500);
  }

  // 2. Insert a provisioning row so the UI can show status immediately.
  const { data: conn, error: insErr } = await admin
    .from('broker_connections')
    .insert({
      user_id: userId,
      account_name: nickname,
      platform,
      server,
      login,
      investor_password_encrypted: cipher,
      status: 'provisioning',
    })
    .select()
    .single();
  if (insErr || !conn) {
    return json({ error: `db insert failed: ${insErr?.message}` }, 500);
  }

  // 3. Create the MetaApi account. On failure, mark the row as error and return.
  let metaapiAccountId: string;
  try {
    const account = await provisionAccount(metaapiToken, {
      name: nickname,
      type: 'cloud-g2',
      login,
      password: investorPassword,
      server,
      platform,
    });
    metaapiAccountId = account.id;
  } catch (e) {
    const msg = (e as Error).message;
    await admin
      .from('broker_connections')
      .update({ status: 'error', last_error: msg, updated_at: new Date().toISOString() })
      .eq('id', conn.id);
    return json({ error: msg }, 502);
  }

  // 4. Store the MetaApi account id, mark as provisioning-deploying.
  await admin
    .from('broker_connections')
    .update({
      metaapi_account_id: metaapiAccountId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conn.id);

  // 5. Deploy the account (starts the terminal on MetaApi's infrastructure).
  try {
    await deployAccount(metaapiToken, metaapiAccountId);
  } catch (e) {
    const msg = (e as Error).message;
    // Try to clean up the MetaApi side so we don't leak paid resources on a
    // broken provisioning attempt. Swallow errors from the cleanup itself.
    try {
      await deleteAccount(metaapiToken, metaapiAccountId);
    } catch { /* noop */ }
    await admin
      .from('broker_connections')
      .update({ status: 'error', last_error: msg, updated_at: new Date().toISOString() })
      .eq('id', conn.id);
    return json({ error: msg }, 502);
  }

  // 6. Flip to active. The sync function (called on login or manually) will
  //    redeploy, pull trades, and undeploy again.
  await admin
    .from('broker_connections')
    .update({
      status: 'active',
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conn.id);

  // 7. Undeploy to keep idle costs at $0.00105/hr instead of $0.0126/hr.
  //    Swallow any errors — the account is already marked active.
  try {
    await undeployAccount(metaapiToken, metaapiAccountId);
  } catch { /* noop */ }

  return new Response(
    JSON.stringify({
      connectionId: conn.id,
      metaapiAccountId,
      status: 'active',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
