import { useRef, useMemo } from 'react';
import { Copy, Download, Clock } from 'lucide-react';
import { toPng } from 'html-to-image';
import { getTradesForDate, formatDuration } from '../../utils/tradeStats';
import { differenceInMinutes, parseISO } from 'date-fns';
import { dateKeyUTC, formatDateLongUTC } from '../../utils/dateFormat';

const fmtMoney = (n) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function TodayCard({ trades }) {
  const cardRef = useRef(null);

  // "Today" = latest trading day in UTC (matches server time).
  // If there are no trades today, fall back to the most recent trading day so
  // the card isn't empty on weekends / after market close.
  const latestTradeDate = useMemo(() => {
    if (!trades || trades.length === 0) return null;
    const sorted = [...trades].filter((t) => t.closeTime).sort((a, b) =>
      (b.closeTime || '').localeCompare(a.closeTime || ''),
    );
    return sorted[0]?.closeTime || null;
  }, [trades]);

  const today = latestTradeDate ? dateKeyUTC(latestTradeDate) : dateKeyUTC(new Date());
  const todayLabel = today ? formatDateLongUTC(today + 'T00:00:00Z') : '';

  const todayTrades = useMemo(() => getTradesForDate(trades, today), [trades, today]);

  const profit = todayTrades.reduce((s, t) => s + (t.profit || 0), 0);
  const commission = todayTrades.reduce((s, t) => s + (t.commission || 0), 0);
  const wins = todayTrades.filter((t) => (t.profit || 0) > 0).length;
  const losses = todayTrades.filter((t) => (t.profit || 0) < 0).length;
  const winRate = todayTrades.length > 0 ? (wins / todayTrades.length) * 100 : 0;
  const bestTrade = todayTrades.length > 0 ? Math.max(...todayTrades.map((t) => t.profit || 0)) : 0;
  const worstTrade = todayTrades.length > 0 ? Math.min(...todayTrades.map((t) => t.profit || 0)) : 0;

  // Avg hold time
  const durations = todayTrades.map((t) => {
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

  if (todayTrades.length === 0) return null;

  // Format a single trade's P/L with sign + currency
  const signed = (n) => `${n >= 0 ? '+' : '-'}$${fmtMoney(Math.abs(n))}`;

  async function exportImage() {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: '#0f0f0f' });
      const link = document.createElement('a');
      link.download = `kalgoh-${today}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Export failed:', e);
    }
  }

  function copyText() {
    const text = [
      `${todayLabel}`,
      `P/L: ${signed(profit)}`,
      `Trades: ${todayTrades.length} (${wins}W/${losses}L)`,
      `Win Rate: ${winRate.toFixed(0)}%`,
      `Best: ${signed(bestTrade)} | Worst: ${signed(worstTrade)}`,
      ``,
      `— Kalgoh`,
    ].join('\n');
    navigator.clipboard.writeText(text);
  }

  const tradeWord = todayTrades.length === 1 ? 'trade' : 'trades';
  const accent = isPositive ? 'rgba(74,222,128,0.10)' : 'rgba(248,113,113,0.10)';

  return (
    <div className="relative">
      {/* Shareable card */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-card shadow-xl shadow-black/20"
        aria-label={`Today's trading summary: ${isPositive ? 'profit' : 'loss'} of $${fmtMoney(Math.abs(profit))} across ${todayTrades.length} ${tradeWord}`}
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
          {/* Header — quiet label row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span
                aria-hidden="true"
                className={`w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-profit' : 'bg-loss'} shadow-[0_0_12px_currentColor] ${isPositive ? 'text-profit' : 'text-loss'}`}
              />
              <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-text-card-muted">Today</p>
              <span aria-hidden="true" className="text-text-card-muted/40">·</span>
              <p className="text-[11px] text-text-card-muted tabular-nums truncate">{todayLabel}</p>
            </div>
            <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-text-card-muted/35">Kalgoh</span>
          </div>

          {/* Hero P/L */}
          <div className="mt-8 lg:mt-10">
            <p
              className={`text-[42px] leading-[0.95] lg:text-[72px] font-bold tabular-nums tracking-[-0.035em] ${isPositive ? 'text-profit' : 'text-loss'}`}
            >
              {isPositive ? '+' : '-'}${fmtMoney(Math.abs(profit))}
            </p>
            <p className="mt-3 text-xs lg:text-sm text-text-card-muted tabular-nums">
              <span className="text-text-card">{todayTrades.length}</span> {tradeWord}
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

          {/* Secondary stats — inline, labels above, quiet dividers */}
          <dl className="mt-5 lg:mt-6 grid grid-cols-3 gap-4 lg:gap-6">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] font-medium text-text-card-muted/80">W / L</dt>
              <dd className="mt-1.5 text-base lg:text-lg font-semibold tabular-nums text-text-light">
                {wins}<span className="text-text-card-muted/50 font-normal mx-0.5">/</span>{losses}
              </dd>
            </div>
            <div className="relative pl-4 lg:pl-6">
              <span aria-hidden="true" className="absolute left-0 top-0.5 bottom-0.5 w-px bg-white/[0.06]" />
              <dt className="text-[10px] uppercase tracking-[0.14em] font-medium text-text-card-muted/80">Best</dt>
              <dd className={`mt-1.5 text-base lg:text-lg font-semibold tabular-nums ${bestPositive ? 'text-profit' : 'text-loss'}`}>
                {signed(bestTrade)}
              </dd>
            </div>
            <div className="relative pl-4 lg:pl-6">
              <span aria-hidden="true" className="absolute left-0 top-0.5 bottom-0.5 w-px bg-white/[0.06]" />
              <dt className="text-[10px] uppercase tracking-[0.14em] font-medium text-text-card-muted/80">Worst</dt>
              <dd className={`mt-1.5 text-base lg:text-lg font-semibold tabular-nums ${worstPositive ? 'text-profit' : 'text-loss'}`}>
                {signed(worstTrade)}
              </dd>
            </div>
          </dl>

          {avgHold > 0 && (
            <div className="mt-5 lg:mt-6 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-text-card-muted/80" aria-hidden="true" />
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
