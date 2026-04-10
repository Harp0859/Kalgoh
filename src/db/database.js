import { supabase } from './supabase';

// Get current user id or throw
async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// ============================================================================
// SETTINGS
// ============================================================================

export async function getSetting(key, defaultValue = null) {
  const userId = await getUserId();
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle();
  return data?.value ?? defaultValue;
}

export async function setSetting(key, value) {
  const userId = await getUserId();
  await supabase
    .from('settings')
    .upsert({ user_id: userId, key, value, updated_at: new Date().toISOString() }, { onConflict: 'user_id,key' });
}

// ============================================================================
// NOTES
// ============================================================================

export async function getNote(dateKey, account) {
  const userId = await getUserId();
  const { data } = await supabase
    .from('notes')
    .select('text')
    .eq('user_id', userId)
    .eq('date_key', dateKey)
    .eq('account', account)
    .maybeSingle();
  return data?.text || '';
}

export async function saveNote(dateKey, account, text) {
  const userId = await getUserId();
  if (text.trim()) {
    await supabase
      .from('notes')
      .upsert(
        { user_id: userId, date_key: dateKey, account, text, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,date_key,account' }
      );
  } else {
    await supabase
      .from('notes')
      .delete()
      .eq('user_id', userId)
      .eq('date_key', dateKey)
      .eq('account', account);
  }
}

export async function getAllNotes() {
  const userId = await getUserId();
  const { data } = await supabase
    .from('notes')
    .select('date_key, account, text')
    .eq('user_id', userId);
  // Map to old camelCase shape
  return (data || []).map((n) => ({ dateKey: n.date_key, account: n.account, text: n.text }));
}

// ============================================================================
// TRADES
// ============================================================================

// Postgres `numeric` is returned as a string by supabase-js to preserve precision.
// Convert to JS number for math operations.
const num = (v) => (v === null || v === undefined ? 0 : Number(v));

// Convert DB row (snake_case) to app shape (camelCase)
function toTrade(row) {
  return {
    id: row.id,
    ticket: row.ticket,
    openTime: row.open_time,
    closeTime: row.close_time,
    type: row.type,
    symbol: row.symbol,
    volume: num(row.volume),
    openPrice: num(row.open_price),
    closePrice: num(row.close_price),
    sl: num(row.sl),
    tp: num(row.tp),
    commission: num(row.commission),
    swap: num(row.swap),
    profit: num(row.profit),
    comment: row.comment,
    account: row.account,
    uploadId: row.upload_id,
  };
}

// Convert app shape (camelCase) to DB row (snake_case)
function toRow(trade, userId, uploadId, account) {
  return {
    user_id: userId,
    upload_id: uploadId,
    account,
    ticket: trade.ticket,
    open_time: trade.openTime,
    close_time: trade.closeTime,
    type: trade.type,
    symbol: trade.symbol,
    volume: trade.volume,
    open_price: trade.openPrice,
    close_price: trade.closePrice,
    sl: trade.sl,
    tp: trade.tp,
    commission: trade.commission,
    swap: trade.swap,
    profit: trade.profit,
    comment: trade.comment,
  };
}

export async function saveTrades(trades, fileName, meta) {
  const userId = await getUserId();
  const accountName = meta?.accountName || fileName.replace(/\.[^.]+$/, '');

  // Fetch existing trades for this account to dedup
  const { data: existing } = await supabase
    .from('trades')
    .select('ticket, open_time, close_time')
    .eq('user_id', userId)
    .eq('account', accountName);

  const existingKeys = new Set();
  for (const t of existing || []) {
    existingKeys.add(`${t.ticket || ''}|${t.close_time || ''}|${t.open_time || ''}`);
  }

  const newTrades = [];
  let skipped = 0;
  for (const t of trades) {
    const key = `${t.ticket || ''}|${t.closeTime || ''}|${t.openTime || ''}`;
    if (existingKeys.has(key)) { skipped++; continue; }
    newTrades.push(t);
    existingKeys.add(key);
  }

  // Insert upload record first
  const { data: upload, error: uploadErr } = await supabase
    .from('uploads')
    .insert({
      user_id: userId,
      file_name: fileName,
      account_name: accountName,
      trade_count: trades.length,
      new_count: newTrades.length,
      skipped_count: skipped,
    })
    .select()
    .single();

  if (uploadErr) throw uploadErr;

  // Bulk insert new trades
  if (newTrades.length > 0) {
    const rows = newTrades.map((t) => toRow(t, userId, upload.id, accountName));
    const { error } = await supabase.from('trades').insert(rows);
    if (error) throw error;
  }

  // Save starting balance (first deposit)
  if (meta?.startingBalance > 0) {
    const balKey = `startingBalance_${accountName}`;
    const existing = await getSetting(balKey, 0);
    if (!existing) await setSetting(balKey, meta.startingBalance);
  }

  // Save balance operations
  if (meta?.balanceOperations?.length > 0) {
    // Fetch existing balance ops for dedup
    const { data: existingOps } = await supabase
      .from('balance_ops')
      .select('time, amount')
      .eq('user_id', userId)
      .eq('account', accountName);

    const existingOpKeys = new Set((existingOps || []).map((o) => `${o.time}|${o.amount}`));
    const newOps = meta.balanceOperations
      .filter((op) => op.time && !existingOpKeys.has(`${op.time}|${op.amount}`))
      .map((op) => ({
        user_id: userId,
        account: accountName,
        time: op.time,
        amount: op.amount,
        balance_after: op.balanceAfter,
        comment: op.comment,
      }));

    if (newOps.length > 0) {
      await supabase.from('balance_ops').insert(newOps);
    }
  }

  return { uploadId: upload.id, newCount: newTrades.length, skippedCount: skipped, total: trades.length };
}

export async function getAccounts() {
  const userId = await getUserId();

  // Accounts come from two places: manually uploaded files and
  // MetaApi-synced broker connections. We union both so a freshly-connected
  // broker shows up in the dropdown immediately, even before its first sync
  // has landed any trade rows.
  const [uploadsRes, connectionsRes] = await Promise.all([
    supabase.from('uploads').select('account_name').eq('user_id', userId),
    supabase.from('broker_connections').select('account_name').eq('user_id', userId),
  ]);

  const names = new Set();
  for (const u of uploadsRes.data || []) {
    if (u.account_name) names.add(u.account_name);
  }
  for (const c of connectionsRes.data || []) {
    if (c.account_name) names.add(c.account_name);
  }
  return [...names].sort();
}

export async function getAllTrades() {
  const userId = await getUserId();
  // Supabase caps at 1000 rows by default — use range for pagination
  const allTrades = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allTrades.push(...data.map(toTrade));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allTrades;
}

export async function getUploads() {
  const userId = await getUserId();
  const { data } = await supabase
    .from('uploads')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false });

  return (data || []).map((u) => ({
    id: u.id,
    fileName: u.file_name,
    accountName: u.account_name,
    tradeCount: u.trade_count,
    newCount: u.new_count,
    skippedCount: u.skipped_count,
    uploadedAt: u.uploaded_at,
  }));
}

export async function deleteUpload(uploadId) {
  const userId = await getUserId();
  await supabase.from('trades').delete().eq('user_id', userId).eq('upload_id', uploadId);
  await supabase.from('uploads').delete().eq('user_id', userId).eq('id', uploadId);
}

// ============================================================================
// BALANCE OPS
// ============================================================================

export async function getBalanceOps(account) {
  const userId = await getUserId();
  let query = supabase
    .from('balance_ops')
    .select('*')
    .eq('user_id', userId)
    .order('time', { ascending: true });

  if (account && account !== 'all') {
    query = query.eq('account', account);
  }

  const { data } = await query;
  return (data || []).map((o) => ({
    id: o.id,
    account: o.account,
    time: o.time,
    amount: num(o.amount),
    balanceAfter: num(o.balance_after),
    comment: o.comment,
  }));
}

// ============================================================================
// CLEAR ALL
// ============================================================================

export async function clearAllData() {
  const userId = await getUserId();
  await supabase.from('trades').delete().eq('user_id', userId);
  await supabase.from('uploads').delete().eq('user_id', userId);
  await supabase.from('balance_ops').delete().eq('user_id', userId);
  await supabase.from('notes').delete().eq('user_id', userId);
  await supabase.from('settings').delete().eq('user_id', userId);
}
