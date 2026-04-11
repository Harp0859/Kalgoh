import { useState, useMemo, useEffect, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachWeekOfInterval } from 'date-fns';
import { toPng } from 'html-to-image';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar, BarChart3, StickyNote, Download, DollarSign, Percent, Loader2 } from 'lucide-react';
import { getMonthlyCalendar, getAvailableMonths, getTradesForDate } from '../../utils/tradeStats';
import { dateKeyUTC } from '../../utils/dateFormat';
import { getAllNotes } from '../../db/database';
import { useTheme } from '../../theme/ThemeContext';
import DayModal from './DayModal';

const WEEKDAYS_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getProfitBg(profit) {
  if (profit === 0) return '';
  // Dual-toned: every profit day uses the theme-aware profit-bg
  // token, every loss day uses the loss-bg token. Magnitude lives
  // in the label, not the background. Using the explicit bg tokens
  // (instead of color-mix) means both themes get a tint that was
  // tuned for their own surface.
  return profit > 0 ? 'var(--color-profit-bg)' : 'var(--color-loss-bg)';
}

export default function DailyCalendar({ trades, allTrades, startingBalance = 0, balanceOps = [] }) {
  const { resolved } = useTheme();
  const logoSrc = resolved === 'light' ? '/kalgoh_white.png' : '/kalgoh-logo.png';
  const months = useMemo(() => getAvailableMonths(trades), [trades]);
  const [monthIdx, setMonthIdx] = useState(() => months.length > 0 ? months.length - 1 : 0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [noteDays, setNoteDays] = useState(new Set());
  // Toggle between dollar and percentage view. Percentage = day P/L
  // divided by the day's starting balance (running balance BEFORE the
  // day's trades are applied), so a $3 gain on $100 is 3%, and then a
  // $30 gain on $300 is 10% even after deposits.
  const [viewMode, setViewMode] = useState('amount'); // 'amount' | 'percent'
  const [downloading, setDownloading] = useState(false);
  const captureRef = useRef(null);

  useEffect(() => {
    getAllNotes()
      .then((notes) => {
        setNoteDays(new Set(notes.filter((n) => n.text?.trim()).map((n) => n.dateKey)));
      })
      .catch((e) => {
        console.error('Failed to load notes:', e);
        setNoteDays(new Set());
      });
  }, [selectedDay]);

  const currentMonth = months[monthIdx] || format(new Date(), 'yyyy-MM');
  const [year, month] = currentMonth.split('-').map(Number);

  const calendarDays = useMemo(
    () => getMonthlyCalendar(trades, year, month - 1),
    [trades, year, month]
  );

  const dayMap = useMemo(() => {
    const m = {};
    calendarDays.forEach((d) => { m[d.dateKey] = d; });
    return m;
  }, [calendarDays]);

  const weeklyData = useMemo(() => {
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 0 });

    return weeks.map((weekStart) => {
      let weekProfit = 0;
      let weekTrades = 0;
      const days = [];

      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + d);
        const key = format(date, 'yyyy-MM-dd');
        const dayData = dayMap[key];
        const inMonth = date.getMonth() === month - 1;

        if (dayData && inMonth) {
          weekProfit += dayData.profit;
          weekTrades += dayData.trades;
        }

        days.push({ date, key, inMonth, data: inMonth ? dayData : null });
      }

      return { weekStart, days, weekProfit, weekTrades };
    });
  }, [dayMap, year, month]);

  const monthProfit = calendarDays.reduce((s, d) => s + d.profit, 0);
  const monthTrades = calendarDays.reduce((s, d) => s + d.trades, 0);
  const tradingDays = calendarDays.filter((d) => d.trades > 0).length;
  const winDays = calendarDays.filter((d) => d.profit > 0).length;

  // Map of dateKey -> starting balance for that day (balance BEFORE
  // the day's trades + deposits are applied). Built by replaying ALL
  // historical trades and balance ops up to, but not including, each
  // day. `allTrades` is the full filtered-by-account set so we don't
  // only see the currently-viewed month.
  const dayStartBalance = useMemo(() => {
    const out = {};
    if (!allTrades || allTrades.length === 0) return out;

    // Build a daily delta map combining trades + balance ops so we can
    // replay chronologically without sorting every trade individually.
    const deltas = {}; // { dateKey: { tradeProfit, balanceOp } }
    for (const t of allTrades) {
      const key = dateKeyUTC(t.closeTime || t.openTime);
      if (!key) continue;
      if (!deltas[key]) deltas[key] = { tradeProfit: 0, balanceOp: 0 };
      deltas[key].tradeProfit += t.profit || 0;
    }
    // Skip the first balance op per account (that's the initial deposit
    // which is already represented by startingBalance).
    const seenFirst = {};
    for (const op of balanceOps || []) {
      if (!op.time) continue;
      const acct = op.account || '_default';
      if (!seenFirst[acct]) { seenFirst[acct] = true; continue; }
      const key = dateKeyUTC(op.time) || op.time.slice(0, 10);
      if (!deltas[key]) deltas[key] = { tradeProfit: 0, balanceOp: 0 };
      deltas[key].balanceOp += op.amount || 0;
    }

    const sortedKeys = Object.keys(deltas).sort();
    let running = Number(startingBalance) || 0;
    for (const k of sortedKeys) {
      out[k] = running; // balance BEFORE this day's activity
      running += deltas[k].tradeProfit + deltas[k].balanceOp;
    }
    return out;
  }, [allTrades, balanceOps, startingBalance]);

  // Can we actually render percentages? Only if we have a meaningful
  // starting balance or running balance series.
  const canShowPercent = Number(startingBalance) > 0 || Object.values(dayStartBalance).some((b) => b > 0);

  // Compact money formatter — keeps long values fitting inside the
  // calendar cell at any magnitude. Under $1k shows 1 or 2 decimals
  // (tight mode uses 1 decimal to save width on mobile). Above $1k
  // abbreviates to k/M so `+$1234.56` becomes `+$1.2k` and
  // `+$1234567` becomes `+$1.2M`.
  const fmtCompactMoney = (amount, tight = false) => {
    const abs = Math.abs(amount);
    const sign = amount >= 0 ? '+' : '-';
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 10_000)    return `${sign}$${Math.round(abs / 1000)}k`;
    if (abs >= 1_000)     return `${sign}$${(abs / 1000).toFixed(1)}k`;
    return `${sign}$${tight ? abs.toFixed(1) : abs.toFixed(2)}`;
  };

  // Format a day's P/L as either $X.XX or X.X%, depending on the
  // active view mode. Returns the string already signed.
  const formatDayValue = (profit, dateKey, mobile = false) => {
    if (viewMode === 'percent' && canShowPercent) {
      const base = dayStartBalance[dateKey] || Number(startingBalance) || 0;
      if (base <= 0.01) return '—';
      const pct = (profit / base) * 100;
      const abs = Math.abs(pct);
      const s = abs < 10 ? abs.toFixed(1) : abs.toFixed(0);
      return `${pct >= 0 ? '+' : '-'}${s}%`;
    }
    return fmtCompactMoney(profit, mobile);
  };

  // Convert a $ amount into a signed "X.X%" string relative to a given
  // baseline. Returns "—" when the baseline is too small to be
  // meaningful (avoids exploding percentages on residual balances).
  const toPctString = (amount, baseline) => {
    if (!baseline || baseline < 0.01) return '—';
    const pct = (amount / baseline) * 100;
    const abs = Math.abs(pct);
    const s = abs < 10 ? abs.toFixed(1) : abs.toFixed(0);
    return `${pct >= 0 ? '+' : '-'}${s}%`;
  };

  // Base balance for an entire *week* — running balance at the start
  // of that week's first TRADING day. Weeks with zero trades return 0
  // so the caller can skip the denominator entirely.
  const weekBaseline = (week) => {
    for (const day of week.days) {
      if (day.inMonth && day.data && day.data.trades > 0) {
        return dayStartBalance[day.key] || 0;
      }
    }
    return 0;
  };

  // Base balance for the whole *month* — running balance at the start
  // of the month's first trading day (falls back to starting balance).
  const monthBaseline = (() => {
    const firstTradingDay = calendarDays.find((d) => d.trades > 0);
    if (firstTradingDay) return dayStartBalance[firstTradingDay.dateKey] || Number(startingBalance) || 0;
    return Number(startingBalance) || 0;
  })();

  async function downloadImage() {
    if (!captureRef.current || downloading) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(captureRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        // Match the page body colour so transparent edges blend.
        backgroundColor:
          getComputedStyle(document.documentElement).getPropertyValue('--color-bg')?.trim() || '#0a0a0a',
      });
      const link = document.createElement('a');
      link.download = `kalgoh-calendar-${year}-${String(month).padStart(2, '0')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Calendar export failed:', e);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="relative max-w-[860px] mx-auto">
      {/* max-width cap is important: without it, zooming out in the
       *  browser (Cmd+-) makes the container grow in CSS pixels,
       *  which makes each `aspect-square` cell grow too — producing
       *  the opposite-of-expected behaviour where the calendar grows
       *  as everything else shrinks. Capping the grid keeps the
       *  whole thing responsive to zoom like any normal page. */}

      {/* Interactive controls (toggle + save) live OUTSIDE the capture
       *  ref, floated over the top-right via absolute positioning so
       *  they sit visually next to the in-capture brand/month nav row
       *  but are excluded from the downloaded PNG. */}
      <div className="absolute top-0 right-0 z-10 h-12 lg:h-14 flex items-center gap-2">
        {canShowPercent && (
          <div
            role="radiogroup"
            aria-label="Value display mode"
            className="inline-flex items-center gap-1 bg-card-lighter rounded-xl p-1 ring-hairline"
          >
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'amount'}
              aria-label="Show as amount"
              title="Amount"
              onClick={() => setViewMode('amount')}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                viewMode === 'amount'
                  ? 'bg-card text-text-light ring-hairline'
                  : 'text-text-card-muted hover:text-text-light'
              }`}
            >
              <DollarSign className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'percent'}
              aria-label="Show as percent"
              title="Percent"
              onClick={() => setViewMode('percent')}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                viewMode === 'percent'
                  ? 'bg-card text-text-light ring-hairline'
                  : 'text-text-card-muted hover:text-text-light'
              }`}
            >
              <Percent className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={downloadImage}
          disabled={downloading}
          aria-label="Save calendar as image"
          title={downloading ? 'Saving…' : 'Save as image'}
          className="w-11 h-11 flex items-center justify-center rounded-xl text-text-card-muted hover:text-text-light bg-card-lighter hover:bg-card-light ring-hairline transition-colors disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Everything from here down is captured when saving as image. */}
      <div ref={captureRef}>
      {/* Header row 1: brand lockup (left) + month nav (centered on
       *  desktop, right on mobile). The brand lives inside the
       *  capture area so the downloaded PNG is branded for social
       *  sharing. The floating $/% + save controls overlay sits
       *  above this row, to the far right, and is outside the
       *  capture. On desktop the month nav is absolute-centered so
       *  it lives at the true midpoint of the calendar width,
       *  regardless of the brand / controls widths. */}
      <div className="relative flex items-center justify-between lg:justify-start gap-3 mb-4 lg:mb-5 h-12 lg:h-14 pr-36 lg:pr-44">
        <div className="flex items-center gap-2 text-text-light">
          <img
            src={logoSrc}
            alt=""
            className="h-10 lg:h-12 w-auto"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <span className="text-xl lg:text-2xl font-bold tracking-tight text-text-light leading-none">
            Kalgoh
          </span>
        </div>

        <div className="flex items-center gap-1.5 lg:gap-2 lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:top-1/2 lg:-translate-y-1/2">
          <button
            type="button"
            onClick={() => setMonthIdx((i) => Math.max(0, i - 1))}
            disabled={monthIdx <= 0}
            aria-label="Previous month"
            className="w-10 h-10 lg:w-11 lg:h-11 flex items-center justify-center rounded-xl bg-card-lighter ring-hairline text-text-card-muted hover:text-text-light hover:bg-card-light disabled:opacity-30 disabled:hover:bg-card-lighter transition-colors duration-200"
          >
            <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5" aria-hidden="true" />
          </button>
          <h3 className="text-base lg:text-xl font-bold text-text-light tracking-tight whitespace-nowrap leading-none min-w-[120px] lg:min-w-[160px] text-center">
            {format(new Date(year, month - 1), 'MMMM yyyy')}
          </h3>
          <button
            type="button"
            onClick={() => setMonthIdx((i) => Math.min(months.length - 1, i + 1))}
            disabled={monthIdx >= months.length - 1}
            aria-label="Next month"
            className="w-10 h-10 lg:w-11 lg:h-11 flex items-center justify-center rounded-xl bg-card-lighter ring-hairline text-text-card-muted hover:text-text-light hover:bg-card-light disabled:opacity-30 disabled:hover:bg-card-lighter transition-colors duration-200"
          >
            <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Month total pill — desktop only, absolute-positioned so
         *  it sits inside the capture area just to the left of the
         *  floating $/% + save controls overlay. Screenshots still
         *  show the headline number; the header stays compact. */}
        <div
          className={`hidden lg:flex absolute top-1/2 left-3/4 -translate-x-1/2 -translate-y-1/2 h-11 w-[120px] items-center justify-center rounded-xl ring-hairline tabular-nums font-bold text-base leading-none ${
            monthProfit >= 0 ? 'text-profit' : 'text-loss'
          }`}
          style={{ backgroundColor: monthProfit >= 0 ? 'var(--color-profit-bg)' : 'var(--color-loss-bg)' }}
        >
          {viewMode === 'percent' && canShowPercent
            ? toPctString(monthProfit, monthBaseline)
            : fmtCompactMoney(monthProfit)}
        </div>
      </div>

      {/* Mobile-only compact total line. Desktop shows the pill
       *  inside the header row instead. Kept inside captureRef so
       *  screenshots always include the headline number. */}
      <div className="lg:hidden flex items-center justify-between mb-3">
        <span className={`font-bold text-lg leading-none tabular-nums ${monthProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
          {viewMode === 'percent' && canShowPercent
            ? toPctString(monthProfit, monthBaseline)
            : fmtCompactMoney(monthProfit)}
        </span>
        <span className="text-[11px] text-text-card-muted tabular-nums">
          {tradingDays} {tradingDays === 1 ? 'day' : 'days'} · {monthTrades} {monthTrades === 1 ? 'trade' : 'trades'}
        </span>
      </div>

      {/* Header row — Mon-Fri on mobile (markets closed on weekends),
       *  full Sun-Sat + weekly column on desktop. */}
      <div className="grid grid-cols-5 lg:grid-cols-6 gap-1 lg:gap-1.5 mb-2 lg:mb-3">
        {WEEKDAYS_FULL.map((day, i) => {
          const isWeekend = i === 0 || i === 6;
          // Weekends are hidden on every breakpoint — markets are
          // closed Sat/Sun, so weekend columns are pure clutter.
          if (isWeekend) return null;
          return (
            <div
              key={day}
              className="text-center text-[11px] lg:text-xs font-semibold text-text-card-muted uppercase tracking-[0.12em] py-1"
            >
              <span className="lg:hidden" aria-hidden="true">{WEEKDAYS_SHORT[i]}</span>
              <span className="hidden lg:inline">{day}</span>
              <span className="sr-only lg:hidden">{day}</span>
            </div>
          );
        })}
        <div className="hidden lg:block text-center text-xs font-semibold text-text-card-muted uppercase tracking-[0.12em] py-1">
          Weekly
        </div>
      </div>

      {/* Weeks */}
      <div className="space-y-1 lg:space-y-1.5">
        {weeklyData.map((week, wi) => (
          <div key={wi} className="grid grid-cols-5 lg:grid-cols-6 gap-1 lg:gap-1.5 items-stretch">
            {week.days.map((day) => {
              // Weekends (Sat/Sun) are hidden on every breakpoint —
              // markets are closed so those columns are always empty.
              const dow = day.date.getDay();
              const isWeekend = dow === 0 || dow === 6;
              if (isWeekend) return null;

              if (!day.inMonth) {
                return <div key={day.key} className="aspect-square rounded-xl" />;
              }

              const d = day.data;
              const hasProfit = d && d.trades > 0;
              const profit = d?.profit || 0;
              const bgColor = hasProfit ? getProfitBg(profit) : '';
              const profitLabel = hasProfit
                ? `${format(day.date, 'MMMM d')}: ${profit >= 0 ? 'profit' : 'loss'} of $${Math.abs(profit).toFixed(2)}, ${d.trades} trade${d.trades !== 1 ? 's' : ''}`
                : `${format(day.date, 'MMMM d')}: no trades`;

              if (hasProfit) {
                return (
                  <button
                    type="button"
                    key={day.key}
                    aria-label={profitLabel}
                    className="group relative aspect-square rounded-xl cursor-pointer ring-hairline hover:-translate-y-0.5 hover:shadow-md transition-all duration-150"
                    onClick={() => setSelectedDay(day.key)}
                    style={{ backgroundColor: bgColor }}
                  >
                    {/* Date — pinned top-left so the value has the whole center. */}
                    <span className="absolute top-2 left-2 lg:top-2.5 lg:left-3 text-[11px] lg:text-sm font-semibold text-text-card-muted tabular-nums leading-none">
                      {format(day.date, 'd')}
                    </span>
                    {noteDays.has(day.key) && (
                      <StickyNote
                        className="absolute top-2 right-2 lg:top-2.5 lg:right-3 w-3 h-3 lg:w-3.5 lg:h-3.5 text-accent-blue"
                        aria-hidden="true"
                      />
                    )}
                    {/* Value — centered, dominant. */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 lg:gap-1 px-1">
                      <span className={`text-lg lg:text-[26px] font-bold leading-none tabular-nums tracking-tight ${profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                        <span className="lg:hidden">{formatDayValue(profit, day.key, true)}</span>
                        <span className="hidden lg:inline">{formatDayValue(profit, day.key, false)}</span>
                      </span>
                      <span className="hidden lg:block text-[11px] text-text-card-muted leading-none tabular-nums">
                        {d.trades} {d.trades === 1 ? 'trade' : 'trades'}
                      </span>
                    </div>
                  </button>
                );
              }

              return (
                <div
                  key={day.key}
                  aria-label={profitLabel}
                  className="relative aspect-square rounded-xl bg-card-light ring-hairline"
                >
                  <span className="absolute top-2 left-2 lg:top-2.5 lg:left-3 text-[11px] lg:text-sm font-semibold text-text-card-muted tabular-nums leading-none">
                    {format(day.date, 'd')}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center text-xs text-text-card-muted leading-none" aria-hidden="true">—</span>
                </div>
              );
            })}

            {/* Weekly total — desktop only, matches day-cell size. */}
            <div
              className="hidden lg:flex aspect-square rounded-xl flex-col items-center justify-center gap-1 p-3 ring-hairline"
              style={{
                backgroundColor: week.weekTrades > 0
                  ? (week.weekProfit >= 0 ? 'var(--color-profit-bg)' : 'var(--color-loss-bg)')
                  : 'var(--color-card-light)',
              }}
            >
              {week.weekTrades > 0 ? (
                <>
                  <span className={`text-xl xl:text-2xl font-bold tracking-tight leading-none tabular-nums ${week.weekProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {viewMode === 'percent' && canShowPercent
                      ? toPctString(week.weekProfit, weekBaseline(week))
                      : fmtCompactMoney(week.weekProfit)}
                  </span>
                  <span className="text-xs text-text-card-muted tabular-nums">
                    {week.weekTrades} {week.weekTrades === 1 ? 'trade' : 'trades'}
                  </span>
                </>
              ) : (
                <span className="text-sm text-text-card-muted">—</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {tradingDays > 0 && (() => {
        const fmtMoney = (n) => Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const usePct = viewMode === 'percent' && canShowPercent;

        // Per-day percentages for best/worst/avg when in % mode.
        const dailyPcts = calendarDays
          .filter((d) => d.trades > 0)
          .map((d) => {
            const base = dayStartBalance[d.dateKey] || monthBaseline;
            return base >= 0.01 ? (d.profit / base) * 100 : 0;
          });
        const fmtPct = (pct) => {
          const abs = Math.abs(pct);
          const s = abs < 10 ? abs.toFixed(1) : abs.toFixed(0);
          return `${pct >= 0 ? '+' : '-'}${s}%`;
        };

        const avgDay = monthProfit / tradingDays;
        const bestDay = Math.max(...calendarDays.map((d) => d.profit));
        const worstDay = Math.min(...calendarDays.map((d) => d.profit));

        const avgDayPct = dailyPcts.length ? dailyPcts.reduce((a, b) => a + b, 0) / dailyPcts.length : 0;
        const bestDayPct = dailyPcts.length ? Math.max(...dailyPcts) : 0;
        const worstDayPct = dailyPcts.length ? Math.min(...dailyPcts) : 0;

        // Derive sign from the actual value so an all-losing month
        // renders "Best Day" in loss color (instead of forcing it to
        // always look positive).
        const bestDayVal = usePct ? bestDayPct : bestDay;
        const worstDayVal = usePct ? worstDayPct : worstDay;
        const stats = [
          { label: 'Win Days', value: `${winDays}/${tradingDays}`, sub: `${((winDays / tradingDays) * 100).toFixed(0)}%`, icon: Calendar },
          {
            label: 'Avg Day',
            value: usePct ? fmtPct(avgDayPct) : `${avgDay >= 0 ? '+' : '-'}$${fmtMoney(avgDay)}`,
            positive: (usePct ? avgDayPct : avgDay) >= 0,
            icon: BarChart3,
          },
          {
            label: 'Best Day',
            value: usePct ? fmtPct(bestDayPct) : `${bestDay >= 0 ? '+' : '-'}$${fmtMoney(bestDay)}`,
            positive: bestDayVal >= 0,
            icon: TrendingUp,
          },
          {
            label: 'Worst Day',
            value: usePct ? fmtPct(worstDayPct) : `${worstDay >= 0 ? '+' : '-'}$${fmtMoney(worstDay)}`,
            positive: worstDayVal >= 0,
            icon: TrendingDown,
          },
        ];
        return (
          <div className="mt-6 lg:mt-8 grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-card-light ring-hairline rounded-xl lg:rounded-2xl p-3 lg:p-4 min-h-[68px] lg:min-h-[88px]">
                <div className="flex items-center gap-1.5 lg:gap-2 mb-1.5 lg:mb-2">
                  <stat.icon className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-text-card-muted shrink-0" aria-hidden="true" />
                  <p className="text-[10px] lg:text-[11px] uppercase tracking-[0.1em] text-text-card-muted font-semibold whitespace-nowrap">{stat.label}</p>
                </div>
                <p className={`text-base lg:text-xl font-bold tabular-nums leading-tight ${
                  stat.positive === undefined ? 'text-text-light' : stat.positive ? 'text-profit' : 'text-loss'
                }`}>
                  {stat.value}
                </p>
                {stat.sub && <p className="text-xs text-text-card-muted mt-0.5 tabular-nums">{stat.sub}</p>}
              </div>
            ))}
          </div>
        );
      })()}

      </div>{/* end captureRef */}

      {/* Day detail modal */}
      {selectedDay && (
        <DayModal
          dateKey={selectedDay}
          trades={getTradesForDate(trades, selectedDay)}
          account={trades[0]?.account || 'all'}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}
