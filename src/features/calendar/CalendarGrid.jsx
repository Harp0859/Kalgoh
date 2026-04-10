import { useState, useMemo, useEffect } from 'react';
import { format, endOfWeek, eachWeekOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar, BarChart3, StickyNote } from 'lucide-react';
import { getMonthlyCalendar, getAvailableMonths, getTradesForDate } from '../../utils/tradeStats';
import { getAllNotes } from '../../db/database';
import DayModal from './DayModal';

const WEEKDAYS_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getProfitBg(profit, maxAbsProfit) {
  if (profit === 0) return '';
  const intensity = Math.min(Math.abs(profit) / (maxAbsProfit || 1), 1);
  const alpha = 0.1 + intensity * 0.45;
  return profit > 0
    ? `rgba(74, 222, 128, ${alpha})`
    : `rgba(248, 113, 113, ${alpha})`;
}

export default function DailyCalendar({ trades }) {
  const months = useMemo(() => getAvailableMonths(trades), [trades]);
  const [monthIdx, setMonthIdx] = useState(() => months.length > 0 ? months.length - 1 : 0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [noteDays, setNoteDays] = useState(new Set());

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

  const maxAbsProfit = useMemo(() => {
    return Math.max(...calendarDays.map((d) => Math.abs(d.profit)), 1);
  }, [calendarDays]);

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

  return (
    <div>
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
              {monthProfit >= 0 ? '+' : '-'}${Math.abs(monthProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      {/* Header row — short labels on mobile, full on desktop */}
      {/* Mobile: 7 cols only | Desktop: 7 cols + weekly */}
      <div className="grid grid-cols-7 lg:grid-cols-[repeat(7,1fr)_120px] gap-1 lg:gap-2 mb-1 lg:mb-2">
        {WEEKDAYS_FULL.map((day, i) => (
          <div key={day} className="text-center text-[10px] font-medium text-text-card-muted uppercase tracking-widest py-1">
            <span className="lg:hidden" aria-hidden="true">{WEEKDAYS_SHORT[i]}</span>
            <span className="hidden lg:inline">{day}</span>
            <span className="sr-only lg:hidden">{day}</span>
          </div>
        ))}
        <div className="hidden lg:block text-center text-[10px] font-medium text-text-card-muted uppercase tracking-widest py-1 border-l border-border-card ml-1 pl-1">
          Weekly
        </div>
      </div>

      {/* Weeks */}
      <div className="space-y-1 lg:space-y-2">
        {weeklyData.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 lg:grid-cols-[repeat(7,1fr)_120px] gap-1 lg:gap-2 items-stretch">
            {week.days.map((day) => {
              if (!day.inMonth) {
                return <div key={day.key} className="min-h-[44px] h-14 lg:h-20 rounded-lg lg:rounded-xl" />;
              }

              const d = day.data;
              const hasProfit = d && d.trades > 0;
              const profit = d?.profit || 0;
              const bgColor = hasProfit ? getProfitBg(profit, maxAbsProfit) : '';
              const profitLabel = hasProfit
                ? `${format(day.date, 'MMMM d')}: ${profit >= 0 ? 'profit' : 'loss'} of $${Math.abs(profit).toFixed(2)}, ${d.trades} trade${d.trades !== 1 ? 's' : ''}`
                : `${format(day.date, 'MMMM d')}: no trades`;

              if (hasProfit) {
                return (
                  <button
                    type="button"
                    key={day.key}
                    aria-label={profitLabel}
                    className="min-h-[44px] h-14 lg:h-20 rounded-lg lg:rounded-xl flex flex-col items-center justify-center gap-0 lg:gap-0.5 cursor-pointer hover:ring-1 hover:ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-all"
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
                      {profit >= 0 ? '+' : '-'}${Math.abs(profit).toFixed(2)}
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
                  className="min-h-[44px] h-14 lg:h-20 rounded-lg lg:rounded-xl flex flex-col items-center justify-center gap-0 lg:gap-0.5 opacity-25"
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
                    {week.weekProfit >= 0 ? '+' : '-'}${Math.abs(week.weekProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
        const avgDay = monthProfit / tradingDays;
        const bestDay = Math.max(...calendarDays.map((d) => d.profit));
        const worstDay = Math.min(...calendarDays.map((d) => d.profit));
        const stats = [
          { label: 'Win Days', value: `${winDays}/${tradingDays}`, sub: `${((winDays / tradingDays) * 100).toFixed(0)}%`, icon: Calendar },
          { label: 'Avg Day', value: `${avgDay >= 0 ? '+' : '-'}$${fmtMoney(avgDay)}`, positive: avgDay >= 0, icon: BarChart3 },
          { label: 'Best Day', value: `+$${fmtMoney(bestDay)}`, positive: true, icon: TrendingUp },
          { label: 'Worst Day', value: `-$${fmtMoney(worstDay)}`, positive: false, icon: TrendingDown },
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
