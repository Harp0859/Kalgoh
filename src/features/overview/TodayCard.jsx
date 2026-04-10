import { useRef, useMemo } from 'react';
import { Copy, Download, TrendingUp, TrendingDown, Trophy, Clock } from 'lucide-react';
import { toPng } from 'html-to-image';
import { getTradesForDate, formatDuration } from '../../utils/tradeStats';
import { differenceInMinutes, parseISO } from 'date-fns';
import { dateKeyUTC, formatDateLongUTC } from '../../utils/dateFormat';

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

  if (todayTrades.length === 0) return null;

  async function exportImage() {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: '#1a1a1a' });
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
      `P/L: ${isPositive ? '+' : ''}$${profit.toFixed(2)}`,
      `Trades: ${todayTrades.length} (${wins}W/${losses}L)`,
      `Win Rate: ${winRate.toFixed(0)}%`,
      `Best: +$${bestTrade.toFixed(2)} | Worst: $${worstTrade.toFixed(2)}`,
      ``,
      `— Kalgoh`,
    ].join('\n');
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="relative">
      {/* Shareable card */}
      <div ref={cardRef} className="bg-card rounded-2xl lg:rounded-3xl p-4 lg:p-6 relative overflow-hidden">
        {/* Subtle gradient accent */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${isPositive ? 'bg-profit' : 'bg-loss'}`} />

        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs text-text-card-muted font-medium uppercase tracking-widest">Today</p>
            <p className="text-sm text-text-card-muted mt-0.5">{todayLabel}</p>
          </div>
          <div className="flex items-center gap-1.5 opacity-40">
            <span className="text-[10px] text-text-card-muted font-medium tracking-wider">KALGOH</span>
          </div>
        </div>

        {/* Main P/L */}
        <div className="mb-6">
          <p className={`text-3xl lg:text-5xl font-bold tracking-tight ${isPositive ? 'text-profit' : 'text-loss'}`}>
            {isPositive ? '+' : ''}${profit.toFixed(2)}
          </p>
          {commission !== 0 && (
            <p className="text-xs text-text-card-muted mt-1">
              After ${Math.abs(commission).toFixed(2)} commission
            </p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div>
            <p className="text-[10px] text-text-card-muted uppercase tracking-wider mb-1">Trades</p>
            <p className="text-lg font-bold text-text-light">{todayTrades.length}</p>
            <p className="text-[11px] text-text-card-muted">{wins}W / {losses}L</p>
          </div>
          <div>
            <p className="text-[10px] text-text-card-muted uppercase tracking-wider mb-1">Win Rate</p>
            <p className={`text-lg font-bold ${winRate >= 50 ? 'text-profit' : 'text-loss'}`}>{winRate.toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-[10px] text-text-card-muted uppercase tracking-wider mb-1">Best</p>
            <p className="text-lg font-bold text-profit">+${bestTrade.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-text-card-muted uppercase tracking-wider mb-1">Worst</p>
            <p className="text-lg font-bold text-loss">${worstTrade.toFixed(2)}</p>
          </div>
        </div>

        {avgHold > 0 && (
          <div className="mt-4 pt-4 border-t border-border-card flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-text-card-muted" />
              <span className="text-[11px] text-text-card-muted">Avg hold: <span className="text-text-light font-medium">{formatDuration(avgHold)}</span></span>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons — outside the exportable card */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={exportImage}
          className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted hover:text-text-primary px-3 py-2 rounded-xl bg-bg-alt hover:bg-border transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Save as Image
        </button>
        <button
          onClick={copyText}
          className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted hover:text-text-primary px-3 py-2 rounded-xl bg-bg-alt hover:bg-border transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          Copy Text
        </button>
      </div>
    </div>
  );
}
