// All trade timestamps come from MT5/MetaApi in UTC. We format them in UTC
// so the app matches what users see in the MT5 terminal exactly, avoiding
// any "wait, why is this 5h off?" confusion due to local timezone rendering.

import { formatInTimeZone } from 'date-fns-tz';
import { parseISO, isValid } from 'date-fns';

const UTC = 'UTC';

function safe(d) {
  if (!d) return null;
  if (typeof d === 'string') {
    const parsed = parseISO(d);
    return isValid(parsed) ? parsed : null;
  }
  return d instanceof Date && isValid(d) ? d : null;
}

/** "Apr 10, 2026 05:20" */
export function formatDateTimeUTC(d) {
  const date = safe(d);
  if (!date) return '-';
  return formatInTimeZone(date, UTC, 'MMM dd, yyyy HH:mm');
}

/** "05:20:54" */
export function formatTimeUTC(d) {
  const date = safe(d);
  if (!date) return '-';
  return formatInTimeZone(date, UTC, 'HH:mm:ss');
}

/** "Apr 10" */
export function formatDateShortUTC(d) {
  const date = safe(d);
  if (!date) return '-';
  return formatInTimeZone(date, UTC, 'MMM d');
}

/** "Friday, April 10, 2026" */
export function formatDateLongUTC(d) {
  const date = safe(d);
  if (!date) return '-';
  return formatInTimeZone(date, UTC, 'EEEE, MMMM d, yyyy');
}

/** "2026-04-10" — date key for grouping */
export function dateKeyUTC(d) {
  const date = safe(d);
  if (!date) return null;
  return formatInTimeZone(date, UTC, 'yyyy-MM-dd');
}

/** UTC hour 0-23 — for hourly heatmap grouping */
export function hourUTC(d) {
  const date = safe(d);
  if (!date) return null;
  return date.getUTCHours();
}

/** UTC day of week (0 = Sunday ... 6 = Saturday) */
export function dayOfWeekUTC(d) {
  const date = safe(d);
  if (!date) return null;
  return date.getUTCDay();
}
