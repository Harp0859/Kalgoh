import { useState, useMemo, useEffect, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachWeekOfInterval } from 'date-fns';
import { toPng } from 'html-to-image';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar, BarChart3, StickyNote, Download, DollarSign, Percent } from 'lucide-react';
import { getMonthlyCalendar, getAvailableMonths, getTradesForDate } from '../../utils/tradeStats';
import { dateKeyUTC } from '../../utils/dateFormat';
import { getAllNotes } from '../../db/database';
import DayModal from './DayModal';

const WEEKDAYS_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getProfitBg(profit) {
  if (profit === 0) return '';
  // Dual-toned: every profit day is the same subtle orange, every
  // loss day is the same subtle grey. Magnitude lives in the label,
  // not the background.
  return profit > 0
    ? 'color-mix(in srgb, var(--color-profit) 16%, transparent)'
    : 'color-mix(in srgb, var(--color-loss) 16%, transparent)';
}

export default function DailyCalendar({ trades, allTrades, startingBalance = 0, balanceOps = [] }) {
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
    const abs = Math.abs(profit);
    const s = mobile ? abs.toFixed(1) : abs.toFixed(2);
    return `${profit >= 0 ? '+' : '-'}$${s}`;
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
    <div>
      {/* Toolbar — $/% toggle + Save as image.
       *  Lives outside the capture ref so it doesn't appear in the
       *  downloaded PNG. */}
      <div className="flex items-center justify-between gap-2 mb-4 lg:mb-5">
        {canShowPercent ? (
          <div
            role="radiogroup"
            aria-label="Value display mode"
            className="inline-flex items-center gap-1 bg-card-lighter rounded-xl p-1"
          >
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'amount'}
              aria-label="Show as amount"
              title="Amount"
              onClick={() => setViewMode('amount')}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 ${
                viewMode === 'amount'
                  ? 'bg-card text-text-light shadow-sm shadow-black/20'
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
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 ${
                viewMode === 'percent'
                  ? 'bg-card text-text-light shadow-sm shadow-black/20'
                  : 'text-text-card-muted hover:text-text-light'
              }`}
            >
              <Percent className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={downloadImage}
          disabled={downloading}
          aria-label="Save calendar as image"
          className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-card-muted hover:text-text-light bg-card-lighter hover:bg-card-light transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          {downloading ? 'Saving…' : 'Save as image'}
        </button>
      </div>

      {/* Everything from here down is captured when saving as image. */}
      <div ref={captureRef}>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <button
          type="button"
          onClick={() => setMonthIdx((i) => Math.max(0, i - 1))}
          disabled={monthIdx <= 0}
          aria-label="Previous month"
          className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-card-lighter text-text-card-muted hover:text-text-light disabled:opacity-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-colors duration-200"
        >
          <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5" aria-hidden="true" />
        </button>

        <div className="text-center">
          <h3 className="text-xl lg:text-3xl font-bold text-text-light tracking-tight">
            {format(new Date(year, month - 1), 'MMMM yyyy')}
          </h3>
          <div className="flex flex-wrap gap-1.5 lg:gap-2 mt-2 lg:mt-3 justify-center">
            <span className="text-xs font-medium text-text-card-muted bg-card-lighter rounded-full px-2.5 lg:px-3 py-0.5 lg:py-1 tabular-nums">
              {tradingDays} days
            </span>
            <span className="text-xs font-medium text-text-card-muted bg-card-lighter rounded-full px-2.5 lg:px-3 py-0.5 lg:py-1 tabular-nums">
              {monthTrades} trades
            </span>
            <span className={`text-xs font-semibold rounded-full px-2.5 lg:px-3 py-0.5 lg:py-1 tabular-nums ${
              monthProfit >= 0 ? 'text-profit bg-profit/10' : 'text-loss bg-loss/10'
            }`}>
              {viewMode === 'percent' && canShowPercent
                ? toPctString(monthProfit, monthBaseline)
                : `${monthProfit >= 0 ? '+' : '-'}$${Math.abs(monthProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMonthIdx((i) => Math.min(months.length - 1, i + 1))}
          disabled={monthIdx >= months.length - 1}
          aria-label="Next month"
          className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-card-lighter text-text-card-muted hover:text-text-light disabled:opacity-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-colors duration-200"
        >
          <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Header row — Mon-Fri on mobile (markets closed on weekends),
       *  full Sun-Sat + weekly column on desktop. */}
      <div className="grid grid-cols-5 lg:grid-cols-[repeat(7,1fr)_120px] gap-1 lg:gap-2 mb-1 lg:mb-2">
        {WEEKDAYS_FULL.map((day, i) => {
          const isWeekend = i === 0 || i === 6;
          return (
            <div
              key={day}
              className={`text-center text-[10px] font-medium text-text-card-muted uppercase tracking-widest py-1 ${
                isWeekend ? 'hidden lg:block' : ''
              }`}
            >
              <span className="lg:hidden" aria-hidden="true">{WEEKDAYS_SHORT[i]}</span>
              <span className="hidden lg:inline">{day}</span>
              <span className="sr-only lg:hidden">{day}</span>
            </div>
          );
        })}
        <div className="hidden lg:block text-center text-[10px] font-medium text-text-card-muted uppercase tracking-widest py-1 border-l border-border-card ml-1 pl-1">
          Weekly
        </div>
      </div>

      {/* Weeks */}
      <div className="space-y-1 lg:space-y-2">
        {weeklyData.map((week, wi) => (
          <div key={wi} className="grid grid-cols-5 lg:grid-cols-[repeat(7,1fr)_120px] gap-1 lg:gap-2 items-stretch">
            {week.days.map((day) => {
              // Hide Sun/Sat cells on mobile — markets are closed,
              // so weekend columns would always be empty clutter.
              const dow = day.date.getDay();
              const isWeekend = dow === 0 || dow === 6;
              const weekendHidden = isWeekend ? 'hidden lg:flex' : '';

              if (!day.inMonth) {
                return <div key={day.key} className={`${weekendHidden} min-h-[44px] h-14 lg:h-20 rounded-lg lg:rounded-xl`} />;
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
                    className={`${isWeekend ? 'hidden lg:flex' : 'flex'} min-h-[44px] h-14 lg:h-20 rounded-lg lg:rounded-xl flex-col items-center justify-center gap-0 lg:gap-0.5 cursor-pointer hover:ring-1 hover:ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-all`}
                    onClick={() => setSelectedDay(day.key)}
                    style={{ backgroundColor: bgColor }}
                  >
                    <div className="flex items-center gap-0.5">
                      <span className="text-xs font-medium text-text-light tabular-nums">
                        {format(day.date, 'd')}
                      </span>
                      {noteDays.has(day.key) && <StickyNote className="w-2 h-2 lg:w-2.5 lg:h-2.5 text-accent-blue" aria-hidden="true" />}
                    </div>
                    <span className={`text-[11px] lg:text-[11px] font-bold leading-none tabular-nums ${profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                      <span className="lg:hidden">{formatDayValue(profit, day.key, true)}</span>
                      <span className="hidden lg:inline">{formatDayValue(profit, day.key, false)}</span>
                    </span>
                    <span className="hidden lg:block text-[10px] text-text-card-muted leading-none tabular-nums">
                      {d.trades} trade{d.trades !== 1 ? 's' : ''}
                    </span>
                  </button>
                );
              }

              return (
                <div
                  key={day.key}
                  aria-label={profitLabel}
                  className={`${isWeekend ? 'hidden lg:flex' : 'flex'} min-h-[44px] h-14 lg:h-20 rounded-lg lg:rounded-xl flex-col items-center justify-center gap-0 lg:gap-0.5 opacity-25`}
                >
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs font-medium text-text-card-muted tabular-nums">
                      {format(day.date, 'd')}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Weekly total — desktop only */}
            <div className={`hidden lg:flex rounded-xl flex-col items-center justify-center px-3 border-l border-border-card ml-1
              ${week.weekTrades > 0
                ? week.weekProfit >= 0 ? 'bg-profit/8' : 'bg-loss/8'
                : 'bg-card-lighter/30'
              }`}
            >
              {week.weekTrades > 0 ? (
                <>
                  <span className={`text-base font-bold tabular-nums ${week.weekProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {viewMode === 'percent' && canShowPercent
                      ? toPctString(week.weekProfit, weekBaseline(week))
                      : `${week.weekProfit >= 0 ? '+' : '-'}$${Math.abs(week.weekProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                  <span className="text-[10px] text-text-card-muted mt-0.5 tabular-nums">{week.weekTrades} trades</span>
                </>
              ) : (
                <span className="text-[10px] text-text-card-muted">--</span>
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
            value: usePct ? fmtPct(bestDayPct) : `+$${fmtMoney(bestDay)}`,
            positive: true,
            icon: TrendingUp,
          },
          {
            label: 'Worst Day',
            value: usePct ? fmtPct(worstDayPct) : `-$${fmtMoney(worstDay)}`,
            positive: false,
            icon: TrendingDown,
          },
        ];
        return (
          <div className="mt-6 lg:mt-8 grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-card-lighter rounded-xl lg:rounded-2xl p-3 lg:p-4 min-h-[60px] lg:min-h-[80px]">
                <div className="flex items-center gap-1.5 lg:gap-2 mb-1 lg:mb-2">
                  <stat.icon className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-text-card-muted" aria-hidden="true" />
                  <p className="text-[10px] uppercase tracking-widest text-text-card-muted font-medium">{stat.label}</p>
                </div>
                <p className={`text-base lg:text-lg font-bold tabular-nums ${
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
