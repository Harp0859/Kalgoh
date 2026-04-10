-- Kalgoh: MetaApi broker connections
-- Enables automated sync of MT4/MT5 trade history via MetaApi + MetaStats.
-- Run this in Supabase SQL Editor AFTER the base schema.sql has been applied.

-- ============================================================================
-- pgsodium: used for encrypting investor passwords at rest.
-- ============================================================================

create extension if not exists pgsodium;

-- ============================================================================
-- broker_connections table
-- ============================================================================

create table if not exists public.broker_connections (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,

  -- App-side identifier: what the user sees in their account dropdown.
  -- Also the value written to trades.account and balance_ops.account for synced rows.
  account_name text not null,

  platform text not null check (platform in ('mt4', 'mt5')),

  -- The account id returned by MetaApi provisioning API.
  metaapi_account_id text,

  -- Broker login details.
  server text not null,
  login text not null,

  -- Investor (read-only) password, encrypted with pgsodium.
  -- We store a bytea ciphertext, never plaintext.
  investor_password_encrypted bytea,

  -- Lifecycle:
  --   provisioning  -> MetaApi account being created / deployed
  --   active        -> ready, cron will sync
  --   error         -> last provision or sync failed (see last_error)
  --   disabled      -> user paused the connection
  status text not null default 'provisioning'
    check (status in ('provisioning', 'active', 'error', 'disabled')),

  last_sync_at timestamptz,
  last_error text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_broker_connections_user_id
  on public.broker_connections(user_id);

create unique index if not exists idx_broker_connections_account
  on public.broker_connections(user_id, account_name);

create index if not exists idx_broker_connections_active_sync
  on public.broker_connections(status, last_sync_at)
  where status = 'active';

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.broker_connections enable row level security;

-- Users can see their own connections, but NEVER the encrypted password column
-- via a RLS-visible view. The raw table is readable so UI can show status, but
-- the edge functions are the only callers that need the ciphertext (they use
-- the service role key to bypass RLS).
create policy "users can view their own broker connections"
  on public.broker_connections for select
  using (auth.uid() = user_id);

create policy "users can update their own broker connections"
  on public.broker_connections for update
  using (auth.uid() = user_id);

create policy "users can delete their own broker connections"
  on public.broker_connections for delete
  using (auth.uid() = user_id);

-- Insert is intentionally NOT allowed from client-side. The metaapi-provision
-- edge function (running with service role key) is the only thing that writes
-- rows here, ensuring the investor password is encrypted before it lands.

-- ============================================================================
-- Helper: safely fetch decrypted password (service-role only in practice)
-- ============================================================================

create or replace function public.decrypt_investor_password(conn_id bigint)
returns text
language plpgsql
security definer
set search_path = public, pgsodium
as $$
declare
  cipher bytea;
  plain text;
  key_id uuid;
begin
  -- Only the service role should be calling this. auth.uid() will be null
  -- under the service role, which is exactly what we want to allow.
  if auth.role() <> 'service_role' then
    raise exception 'decrypt_investor_password: forbidden';
  end if;

  select investor_password_encrypted into cipher
  from public.broker_connections
  where id = conn_id;

  if cipher is null then
    return null;
  end if;

  -- Fetch the app's encryption key from pgsodium key store.
  -- The key is created below (or manually via Vault UI).
  select id into key_id from pgsodium.key where name = 'kalgoh_broker_key' limit 1;
  if key_id is null then
    raise exception 'kalgoh_broker_key not found in pgsodium.key';
  end if;

  plain := convert_from(
    pgsodium.crypto_aead_det_decrypt(cipher, convert_to('kalgoh', 'utf8'), key_id),
    'utf8'
  );
  return plain;
end;
$$;

revoke all on function public.decrypt_investor_password(bigint) from public;
grant execute on function public.decrypt_investor_password(bigint) to service_role;

-- Create the encryption key once (idempotent — skip if it already exists).
-- The key lives inside pgsodium's keyring and is NEVER exposed to client RLS.
do $$
begin
  if not exists (select 1 from pgsodium.key where name = 'kalgoh_broker_key') then
    perform pgsodium.create_key(
      'aead-det'::pgsodium.key_type,
      'kalgoh_broker_key'
    );
  end if;
end $$;

-- Symmetric helper for the edge function to encrypt on write. Service role only.
create or replace function public.encrypt_investor_password(plain text)
returns bytea
language plpgsql
security definer
set search_path = public, pgsodium
as $$
declare
  key_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'encrypt_investor_password: forbidden';
  end if;

  select id into key_id from pgsodium.key where name = 'kalgoh_broker_key' limit 1;
  if key_id is null then
    raise exception 'kalgoh_broker_key not found in pgsodium.key';
  end if;

  return pgsodium.crypto_aead_det_encrypt(
    convert_to(plain, 'utf8'),
    convert_to('kalgoh', 'utf8'),
    key_id
  );
end;
$$;

revoke all on function public.encrypt_investor_password(text) from public;
grant execute on function public.encrypt_investor_password(text) to service_role;

-- ============================================================================
-- pg_cron: schedule the sync function every 10 minutes
-- ============================================================================

create extension if not exists pg_cron;

-- We schedule a call to the metaapi-sync edge function via pg_net.
-- The function URL and service role JWT need to be set once in vault.
-- See SUPABASE_SETUP.md for the one-time setup steps.

create extension if not exists pg_net;

-- Only (re)create the cron job if both vault secrets exist.
-- This prevents the migration from failing when run before you've set them.
do $$
declare
  function_url text;
  service_jwt text;
begin
  begin
    select decrypted_secret into function_url
      from vault.decrypted_secrets where name = 'metaapi_sync_url';
    select decrypted_secret into service_jwt
      from vault.decrypted_secrets where name = 'metaapi_sync_service_jwt';
  exception when others then
    raise notice 'vault secrets not set yet, skipping cron creation';
    return;
  end;

  if function_url is null or service_jwt is null then
    raise notice 'vault secrets not set yet, skipping cron creation';
    return;
  end if;

  -- Remove any prior schedule so this migration is idempotent.
  perform cron.unschedule('metaapi-sync-every-10m')
    where exists (select 1 from cron.job where jobname = 'metaapi-sync-every-10m');

  perform cron.schedule(
    'metaapi-sync-every-10m',
    '*/10 * * * *',
    format(
      $cron$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || %L
        ),
        body := '{"source":"cron"}'::jsonb
      );
      $cron$,
      function_url,
      service_jwt
    )
  );
end $$;
