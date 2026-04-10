-- Kalgoh Supabase Schema
-- Run this in Supabase SQL Editor after creating a new project

-- ============================================================================
-- TABLES
-- ============================================================================

-- Trades table
create table if not exists public.trades (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ticket text,
  open_time timestamptz,
  close_time timestamptz,
  type text,
  symbol text,
  volume numeric,
  open_price numeric,
  close_price numeric,
  sl numeric,
  tp numeric,
  commission numeric default 0,
  swap numeric default 0,
  profit numeric default 0,
  comment text,
  account text,
  upload_id bigint,
  created_at timestamptz default now()
);

create index if not exists idx_trades_user_id on public.trades(user_id);
create index if not exists idx_trades_account on public.trades(user_id, account);
create index if not exists idx_trades_close_time on public.trades(user_id, close_time);
create unique index if not exists idx_trades_dedup on public.trades(user_id, account, ticket, close_time);

-- Uploads table
create table if not exists public.uploads (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  account_name text,
  trade_count integer default 0,
  new_count integer default 0,
  skipped_count integer default 0,
  uploaded_at timestamptz default now()
);

create index if not exists idx_uploads_user_id on public.uploads(user_id);

-- Balance operations (deposits, withdrawals, transfers)
create table if not exists public.balance_ops (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  account text not null,
  time timestamptz not null,
  amount numeric not null,
  balance_after numeric,
  comment text,
  created_at timestamptz default now()
);

create index if not exists idx_balance_ops_user_id on public.balance_ops(user_id);
create index if not exists idx_balance_ops_account on public.balance_ops(user_id, account);
create unique index if not exists idx_balance_ops_dedup on public.balance_ops(user_id, account, time, amount);

-- Daily notes
create table if not exists public.notes (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key text not null,
  account text not null default 'all',
  text text,
  updated_at timestamptz default now()
);

create index if not exists idx_notes_user_id on public.notes(user_id);
create unique index if not exists idx_notes_unique on public.notes(user_id, date_key, account);

-- User settings (key-value store)
create table if not exists public.settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb,
  updated_at timestamptz default now(),
  primary key (user_id, key)
);

-- Broker connections (MetaApi / MetaStats synced accounts)
-- The full definition (with encryption helpers + pg_cron schedule) lives in
-- supabase/migrations/20260410_broker_connections.sql — run that migration
-- after this file to enable MT4/MT5 auto-sync.
create table if not exists public.broker_connections (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_name text not null,
  platform text not null check (platform in ('mt4', 'mt5')),
  metaapi_account_id text,
  server text not null,
  login text not null,
  investor_password_encrypted bytea,
  status text not null default 'provisioning'
    check (status in ('provisioning', 'active', 'error', 'disabled')),
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.trades enable row level security;
alter table public.uploads enable row level security;
alter table public.balance_ops enable row level security;
alter table public.notes enable row level security;
alter table public.settings enable row level security;
alter table public.broker_connections enable row level security;

create policy "users can view their own broker connections"   on public.broker_connections for select using (auth.uid() = user_id);
create policy "users can update their own broker connections" on public.broker_connections for update using (auth.uid() = user_id);
create policy "users can delete their own broker connections" on public.broker_connections for delete using (auth.uid() = user_id);
-- Note: INSERT is intentionally not permitted from the client; see the
-- migration file for the full security rationale. Inserts flow through the
-- metaapi-provision edge function running with the service role key.

-- Trades policies
create policy "users can view their own trades"  on public.trades for select using (auth.uid() = user_id);
create policy "users can insert their own trades" on public.trades for insert with check (auth.uid() = user_id);
create policy "users can update their own trades" on public.trades for update using (auth.uid() = user_id);
create policy "users can delete their own trades" on public.trades for delete using (auth.uid() = user_id);

-- Uploads policies
create policy "users can view their own uploads"   on public.uploads for select using (auth.uid() = user_id);
create policy "users can insert their own uploads" on public.uploads for insert with check (auth.uid() = user_id);
create policy "users can delete their own uploads" on public.uploads for delete using (auth.uid() = user_id);

-- Balance ops policies
create policy "users can view their own balance ops"   on public.balance_ops for select using (auth.uid() = user_id);
create policy "users can insert their own balance ops" on public.balance_ops for insert with check (auth.uid() = user_id);
create policy "users can delete their own balance ops" on public.balance_ops for delete using (auth.uid() = user_id);

-- Notes policies
create policy "users can view their own notes"   on public.notes for select using (auth.uid() = user_id);
create policy "users can insert their own notes" on public.notes for insert with check (auth.uid() = user_id);
create policy "users can update their own notes" on public.notes for update using (auth.uid() = user_id);
create policy "users can delete their own notes" on public.notes for delete using (auth.uid() = user_id);

-- Settings policies
create policy "users can view their own settings"   on public.settings for select using (auth.uid() = user_id);
create policy "users can insert their own settings" on public.settings for insert with check (auth.uid() = user_id);
create policy "users can update their own settings" on public.settings for update using (auth.uid() = user_id);
create policy "users can delete their own settings" on public.settings for delete using (auth.uid() = user_id);
