# Supabase Setup Guide

## 1. Create a Supabase project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Name it "kalgoh", set a database password, pick a region
4. Wait ~2 minutes for it to provision

## 2. Run the schema

1. In your Supabase project, open **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase/schema.sql` into the editor
4. Click "Run"

This creates all tables (trades, uploads, balance_ops, notes, settings) with Row Level Security enabled — every user can only see their own data.

## 3. Enable email authentication

1. In Supabase dashboard, go to **Authentication → Providers**
2. Make sure **Email** is enabled (it is by default)
3. Optional: **Authentication → Email Templates → Magic Link** — customize the email if you want

## 4. Get your API keys

1. Go to **Project Settings → API**
2. Copy these two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon / public key** (starts with `eyJ...`)

## 5. Create `.env.local`

In the project root, create a file called `.env.local`:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 6. Restart the dev server

```bash
npm run dev
```

## How the OTP flow works

1. Enter your email → Supabase sends a 6-digit code
2. Enter the code → you're logged in
3. No password needed. Codes expire after 1 hour.
4. Session persists across page reloads.

## Data migration (optional)

If you had data in the old IndexedDB version, it's only on your local machine and won't sync. After signing up, upload your Excel files again — the app will parse them and store them in Supabase.

Everything is scoped to your user account via Row Level Security, so your data is private even if the database is shared.

---

# MetaApi Auto-Sync Setup (Optional)

This enables the **Connect broker** feature, which pulls MT4/MT5 trade history
from MetaApi + MetaStats automatically every 10 minutes — no more manual file
uploads.

You only need this if you want automated sync; the manual XLSX upload flow
keeps working without any of these steps.

## 1. Sign up for MetaApi

1. Create an account at <https://metaapi.cloud>
2. Go to <https://app.metaapi.cloud/api-access/generate-token>
3. Generate a token with **only** these two APIs checked:
   - Trading account management API
   - MetaStats API
   - (Uncheck everything else — MT manager, real-time streaming, etc.)
4. Copy the token.

## 2. Run the broker_connections migration

1. Open Supabase → **SQL Editor**
2. Copy the entire contents of `supabase/migrations/20260410_broker_connections.sql`
3. Run it. This creates the `broker_connections` table, sets up pgsodium
   encryption for investor passwords, and prepares pg_cron.

## 3. Set edge function secrets

From your project root (needs the Supabase CLI installed: `npm i -g supabase`):

```bash
# Login once
npx supabase login

# Link to your project (grab the ref from your Supabase dashboard URL)
npx supabase link --project-ref <your-project-ref>

# Set the MetaApi token the edge functions will use
npx supabase secrets set METAAPI_TOKEN=<paste the token from step 1>
```

## 4. Deploy the edge functions

```bash
npx supabase functions deploy metaapi-provision
npx supabase functions deploy metaapi-sync
```

## 5. Wire pg_cron to the sync function

The sync function needs to be called every 10 minutes. We store its URL + a
service JWT in Supabase Vault, then the migration's `do $$` block wires up
the cron schedule.

In the **SQL Editor**, run:

```sql
-- Get your function URL from the Supabase dashboard → Edge Functions → metaapi-sync.
-- Get your service role key from Project Settings → API → service_role secret.

select vault.create_secret(
  'https://<your-project-ref>.supabase.co/functions/v1/metaapi-sync',
  'metaapi_sync_url'
);

select vault.create_secret(
  '<paste your service_role JWT here>',
  'metaapi_sync_service_jwt'
);
```

Then re-run the migration (or just the `do $$` block at the bottom) — it will
now find the vault secrets and schedule the cron job `metaapi-sync-every-10m`.

Verify it worked:

```sql
select * from cron.job where jobname = 'metaapi-sync-every-10m';
```

You should see one row with schedule `*/10 * * * *`.

## 6. Use it

1. Restart the dev server (`npm run dev`) or redeploy.
2. Go to the **Upload** tab in the app.
3. Below the file drop zone you'll see a **Connected brokers** card — click
   **Connect**.
4. Fill in platform (MT4/MT5), nickname, broker server, login, and your
   **investor** (read-only) password.
5. Click Connect. The app will provision the account on MetaApi, deploy it,
   and trigger the first sync. Historical trades will start appearing in
   your dashboard within a minute or two.
6. After that, the cron job keeps everything fresh automatically. You can
   also hit the refresh button on a connection to force an immediate sync.

## Troubleshooting

- **"server not configured"** — `METAAPI_TOKEN` secret isn't set on the edge
  function. Re-run `npx supabase secrets set METAAPI_TOKEN=...`.
- **"MetaApi provisionAccount failed: 401"** — the token is wrong or has been
  revoked. Generate a new one and update the secret.
- **"MetaApi provisionAccount failed: 400"** — usually wrong broker server
  name or investor password. The exact server string must match what shows
  in your MT4/MT5 terminal's login dialog.
- **Status stuck on "provisioning"** — MetaApi is still deploying the account
  (can take 30-90s for a first-time deployment). Wait a minute and hit sync.
- **Cron not firing** — check `select * from cron.job;` to confirm the
  schedule exists, and `select * from cron.job_run_details order by start_time desc limit 5;`
  for failure messages.
