-- ============================================================================
-- Disable automatic MetaAPI sync
-- ============================================================================
-- The pg_cron job was pinging MetaAPI every 10 minutes for every active
-- connection. This is unnecessary and expensive — sync should only happen
-- when the user clicks "Sync now" in the UI.
--
-- The metaapi-sync edge function still supports cron-mode requests, but
-- nothing will trigger it automatically after this migration.

do $$
begin
  -- Only attempt to unschedule if pg_cron is installed and the job exists.
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('metaapi-sync-every-10m')
      where exists (select 1 from cron.job where jobname = 'metaapi-sync-every-10m');
    raise notice 'Disabled automatic MetaAPI sync (metaapi-sync-every-10m).';
  end if;
end $$;
