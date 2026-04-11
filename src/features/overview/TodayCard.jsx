import { useRef, useMemo, useState } from 'react';
import { Copy, Download, Clock, DollarSign, Percent } from 'lucide-react';
import { toPng } from 'html-to-image';
import { getTradesForDate, formatDuration } from '../../utils/tradeStats';
import { differenceInMinutes, parseISO } from 'date-fns';
import { dateKeyUTC, formatDateLongUTC } from '../../utils/dateFormat';

const fmtMoney = (n) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function TodayCard({ trades, allTrades, startingBalance = 0, balanceOps = [], hasDateFilter = false }) {
  const cardRef = useRef(null);
  const [viewMode, setViewMode] = useState('amount'); // 'amount' | 'percent'

  // Scan the incoming trades once for: unique day keys (used when
  // we need to label the range) and the latest close time (the
  // "latest day" fallback for the single-day view).
  const { uniqueDayKeys, latestTradeDate } = useMemo(() => {
    if (!trades || trades.length === 0) return { uniqueDayKeys: [], latestTradeDate: null };
    const keys = new Set();
    let latest = null;
    for (const t of trades) {
      const ts = t.closeTime || t.openTime;
      if (!ts) continue;
      const key = dateKeyUTC(ts);
      if (key) keys.add(key);
      if (!latest || ts > latest) latest = ts;
    }
    return { uniqueDayKeys: [...keys].sort(), latestTradeDate: latest };
  }, [trades]);

  // Range mode only when the user EXPLICITLY set a date filter AND
  // the window actually spans more than one trading day. Without a
  // filter, the card always shows the latest trading day — that's
  // the "Today" card's whole job.
  const isRange = hasDateFilter && uniqueDayKeys.length > 1;

  // Single-day mode: latest trading day we actually have data for.
  // Range mode: null (we use the full trades array directly below).
  const today = latestTradeDate ? dateKeyUTC(latestTradeDate) : dateKeyUTC(new Date());
  const realTodayKey = dateKeyUTC(new Date());
  const isActuallyToday = today === realTodayKey;

  // Which trades drive the numbers on this card?
  const cardTrades = useMemo(
    () => (isRange ? trades : getTradesForDate(trades, today)),
    [isRange, trades, today],
  );

  // Header label + subtitle depending on mode.
  const headerLabel = isRange ? 'Range' : isActuallyToday ? 'Today' : 'Latest day';
  const headerSubtitle = isRange
    ? `${formatDateLongUTC(uniqueDayKeys[0] + 'T00:00:00Z')} — ${formatDateLongUTC(uniqueDayKeys[uniqueDayKeys.length - 1] + 'T00:00:00Z')}`
    : formatDateLongUTC(today + 'T00:00:00Z');
  const todayLabel = headerSubtitle; // kept for download/copy compatibility

  const profit = cardTrades.reduce((s, t) => s + (t.profit || 0), 0);
  const commission = cardTrades.reduce((s, t) => s + (t.commission || 0), 0);
  const wins = cardTrades.filter((t) => (t.profit || 0) > 0).length;
  const losses = cardTrades.filter((t) => (t.profit || 0) < 0).length;
  const winRate = cardTrades.length > 0 ? (wins / cardTrades.length) * 100 : 0;
  const bestTrade = cardTrades.length > 0 ? Math.max(...cardTrades.map((t) => t.profit || 0)) : 0;
  const worstTrade = cardTrades.length > 0 ? Math.min(...cardTrades.map((t) => t.profit || 0)) : 0;

  // Avg hold time
  const durations = cardTrades.map((t) => {
    try {
      const open = parseISO(t.openTime);
      const close = parseISO(t.closeTime);
      return differenceInMinutes(close, open);
    } catch { return 0; }
  }).filter((d) => d >= 0);
  const avgHold = durations.length > 0 ? durations.reduce((s, v) => s + v, 0) / durations.length : 0;

  const isPositive = profit >= 0;
  const bestPositive = bestTrade >= 0;
  const worstPositive = worstTrade >= 0; // true = no losing trades

  // In range mode, "W/L" is days won / lost, not trades won / lost.
  const dayBuckets = useMemo(() => {
    if (!isRange) return null;
    const byDay = {};
    for (const t of cardTrades) {
      const k = dateKeyUTC(t.closeTime || t.openTime);
      if (!k) continue;
      byDay[k] = (byDay[k] || 0) + (t.profit || 0);
    }
    return byDay;
  }, [isRange, cardTrades]);
  const winDays = dayBuckets ? Object.values(dayBuckets).filter((p) => p > 0).length : 0;
  const lossDays = dayBuckets ? Object.values(dayBuckets).filter((p) => p < 0).length : 0;
  const totalDays = dayBuckets ? Object.keys(dayBuckets).length : 0;

  // --------------------------------------------------------------
  // Percentage baseline.
  //
  // The "starting balance" for this card is the running balance just
  // BEFORE the first trade/op we're showing. We replay every prior
  // trade + balance op (drawn from `allTrades`/`balanceOps`) up to,
  // but not including, the first day rendered on the card.
  // --------------------------------------------------------------
  const baselineBalance = useMemo(() => {
    const firstKey = isRange ? uniqueDayKeys[0] : today;
    if (!firstKey) return Number(startingBalance) || 0;

    let running = Number(startingBalance) || 0;
    const historical = allTrades || trades || [];
    for (const t of historical) {
      const k = dateKeyUTC(t.closeTime || t.openTime);
      if (k && k < firstKey) running += t.profit || 0;
    }
    // Skip the first balance op per account (initial deposit already
    // represented in startingBalance).
    const seenFirst = {};
    for (const op of balanceOps || []) {
      if (!op.time) continue;
      const acct = op.account || '_default';
      if (!seenFirst[acct]) { seenFirst[acct] = true; continue; }
      const k = dateKeyUTC(op.time) || op.time.slice(0, 10);
      if (k && k < firstKey) running += op.amount || 0;
    }
    return running;
  }, [allTrades, trades, balanceOps, startingBalance, isRange, uniqueDayKeys, today]);

  if (cardTrades.length === 0) return null;

  const canShowPercent = baselineBalance >= 0.01;
  // Force amount mode if percent is impossible so we never render NaN.
  const effectiveMode = canShowPercent ? viewMode : 'amount';

  // Percent-aware signed formatter. Shows $X.XX or +/-X.X%.
  const formatValue = (n) => {
    if (effectiveMode === 'percent') {
      const pct = (n / baselineBalance) * 100;
      const abs = Math.abs(pct);
      const s = abs < 10 ? abs.toFixed(1) : abs.toFixed(0);
      return `${pct >= 0 ? '+' : '-'}${s}%`;
    }
    return `${n >= 0 ? '+' : '-'}$${fmtMoney(Math.abs(n))}`;
  };

  // Legacy $-only formatter kept for copyText + alt-text.
  const signed = (n) => `${n >= 0 ? '+' : '-'}$${fmtMoney(Math.abs(n))}`;

  async function exportImage() {
    // Capture the actual on-screen card. It already uses CSS variables
    // and Tailwind classes, so whatever theme + palette is active
    // renders identically in the snapshot. Width is forced to a
    // known-good export width during capture (then reverted) so the
    // image looks good even when triggered from mobile.
    const node = cardRef.current;
    if (!node) return;
    const prevWidth = node.style.width;
    const prevMinWidth = node.style.minWidth;
    try {
      // Desktop-quality export width — wide enough for the hero number
      // and stats to breathe even when the user is on a narrow phone.
      node.style.width = '720px';
      node.style.minWidth = '720px';

      // Read the current theme's body bg so the captured PNG blends
      // seamlessly if the user uploads it onto a matching background.
      const bg = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-bg')
        ?.trim() || '#0a0a0a';

      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: bg,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `kalgoh-${today}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      node.style.width = prevWidth;
      node.style.minWidth = prevMinWidth;
    }
  }

  function copyText() {
    const text = [
      `${todayLabel}`,
      `P/L: ${signed(profit)}`,
      `Trades: ${cardTrades.length} (${wins}W/${losses}L)`,
      `Win Rate: ${winRate.toFixed(0)}%`,
      `Best: ${signed(bestTrade)} | Worst: ${signed(worstTrade)}`,
      ``,
      `— Kalgoh`,
    ].join('\n');
    navigator.clipboard.writeText(text);
  }

  const tradeWord = cardTrades.length === 1 ? 'trade' : 'trades';
  const accent = isPositive ? 'rgba(74,222,128,0.10)' : 'rgba(248,113,113,0.10)';

  return (
    <div className="relative">
      {/* Shareable card */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-card shadow-xl shadow-black/20"
        aria-label={`Today's trading summary: ${isPositive ? 'profit' : 'loss'} of $${fmtMoney(Math.abs(profit))} across ${cardTrades.length} ${tradeWord}`}
      >
        {/* Ambient glow tinted by P/L — soft, single-source light */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(120% 80% at 85% -10%, ${accent} 0%, transparent 55%)`,
          }}
        />
        {/* Inner hairline for depth */}
        <div aria-hidden="true" className="absolute inset-0 rounded-2xl lg:rounded-3xl ring-1 ring-inset ring-white/[0.04] pointer-events-none" />

        <div className="relative p-5 lg:p-7">
          {/* Header — quiet label row.
           *  Mobile: dot + label + date (truncated) | toggle
           *  Desktop: dot + label + date | toggle + Kalgoh brand
           *  The "Kalgoh" brand mark is desktop-only so the mobile
           *  row isn't fighting the date label for space. */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                aria-hidden="true"
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPositive ? 'bg-profit' : 'bg-loss'} shadow-[0_0_12px_currentColor] ${isPositive ? 'text-profit' : 'text-loss'}`}
              />
              <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-text-card-muted whitespace-nowrap">{headerLabel}</p>
              <span aria-hidden="true" className="text-text-card-muted/40 shrink-0">·</span>
              <p className="text-[11px] text-text-card-muted tabular-nums truncate min-w-0">{todayLabel}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canShowPercent && (
                <div
                  role="radiogroup"
                  aria-label="Value display mode"
                  className="inline-flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-0.5"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={viewMode === 'amount'}
                    aria-label="Show as amount"
                    title="Amount"
                    onClick={() => setViewMode('amount')}
                    className={`w-7 h-7 inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 ${
                      viewMode === 'amount'
                        ? 'bg-card-lighter text-text-light'
                        : 'text-text-card-muted hover:text-text-light'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={viewMode === 'percent'}
                    aria-label="Show as percent"
                    title="Percent"
                    onClick={() => setViewMode('percent')}
                    className={`w-7 h-7 inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 ${
                      viewMode === 'percent'
                        ? 'bg-card-lighter text-text-light'
                        : 'text-text-card-muted hover:text-text-light'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
              <span className="hidden lg:inline text-[10px] uppercase tracking-[0.22em] font-semibold text-text-card-muted/35">Kalgoh</span>
            </div>
          </div>

          {/* Hero P/L */}
          <div className="mt-8 lg:mt-10">
            <p
              className={`text-[42px] leading-[0.95] lg:text-[72px] font-bold tabular-nums tracking-[-0.035em] ${isPositive ? 'text-profit' : 'text-loss'}`}
            >
              {formatValue(profit)}
            </p>
            <p className="mt-3 text-xs lg:text-sm text-text-card-muted tabular-nums">
              <span className="text-text-card">{cardTrades.length}</span> {tradeWord}
              <span aria-hidden="true" className="mx-1.5 text-text-card-muted/40">·</span>
              <span className={`font-semibold ${winRate >= 50 ? 'text-profit' : 'text-loss'}`}>
                {winRate.toFixed(0)}%
              </span>
              <span className="ml-1">win rate</span>
              {commission !== 0 && (
                <>
                  <span aria-hidden="true" className="mx-1.5 text-text-card-muted/40">·</span>
                  <span>${fmtMoney(Math.abs(commission))} fees</span>
                </>
              )}
            </p>
          </div>

          {/* Hairline separator */}
          <div
            aria-hidden="true"
            className="mt-7 lg:mt-9 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
          />

          {/* Secondary stats — inline, labels above, quiet dividers.
              In range mode W/L counts profitable vs losing DAYS, not trades. */}
          <dl className="mt-5 lg:mt-6 grid grid-cols-3 gap-4 lg:gap-6">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] font-medium text-text-card-muted/80">
                {isRange ? 'Win days' : 'W / L'}
              </dt>
              <dd className="mt-1.5 text-base lg:text-lg font-semibold tabular-nums text-text-light">
                {isRange ? (
                  <>
                    {winDays}<span className="text-text-card-muted/50 font-normal mx-0.5">/</span>{totalDays}
                  </>
                ) : (
                  <>
                    {wins}<span className="text-text-card-muted/50 font-normal mx-0.5">/</span>{losses}
                  </>
                )}
              </dd>
            </div>
            <div className="relative pl-4 lg:pl-6">
              <span aria-hidden="true" className="absolute left-0 top-0.5 bottom-0.5 w-px bg-white/[0.06]" />
              <dt className="text-[10px] uppercase tracking-[0.14em] font-medium text-text-card-muted/80">Best</dt>
              <dd className={`mt-1.5 text-base lg:text-lg font-semibold tabular-nums ${bestPositive ? 'text-profit' : 'text-loss'}`}>
                {formatValue(bestTrade)}
              </dd>
            </div>
            <div className="relative pl-4 lg:pl-6">
              <span aria-hidden="true" className="absolute left-0 top-0.5 bottom-0.5 w-px bg-white/[0.06]" />
              <dt className="text-[10px] uppercase tracking-[0.14em] font-medium text-text-card-muted/80">Worst</dt>
              <dd className={`mt-1.5 text-base lg:text-lg font-semibold tabular-nums ${worstPositive ? 'text-profit' : 'text-loss'}`}>
                {formatValue(worstTrade)}
              </dd>
            </div>
          </dl>

          {avgHold > 0 && (
            <div className="mt-5 lg:mt-6 flex items-center gap-1.5 whitespace-nowrap">
              <Clock className="w-3 h-3 text-text-card-muted/80 shrink-0" aria-hidden="true" />
              <span className="text-[11px] text-text-card-muted">
                Avg hold
                <span className="ml-1.5 text-text-card font-medium tabular-nums">{formatDuration(avgHold)}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons — outside the exportable card */}
      <div className="flex items-center gap-2 mt-3">
        <button
          type="button"
          onClick={exportImage}
          aria-label="Save today's summary as image"
          className="inline-flex items-center gap-1.5 min-h-[36px] text-xs font-medium text-text-muted hover:text-text-primary px-3 py-2 rounded-xl bg-bg-alt hover:bg-border focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-colors"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          Save as Image
        </button>
        <button
          type="button"
          onClick={copyText}
          aria-label="Copy today's summary as text"
          className="inline-flex items-center gap-1.5 min-h-[36px] text-xs font-medium text-text-muted hover:text-text-primary px-3 py-2 rounded-xl bg-bg-alt hover:bg-border focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
          Copy Text
        </button>
      </div>
    </div>
  );
}
