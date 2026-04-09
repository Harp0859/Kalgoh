import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMonthlyCalendar, getAvailableMonths } from '../utils/tradeStats';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getProfitColor(profit, maxAbsProfit) {
  if (profit === 0) return '';
  const intensity = Math.min(Math.abs(profit) / (maxAbsProfit || 1), 1);
  if (profit > 0) {
    const alpha = 0.15 + intensity * 0.6;
    return `rgba(34, 197, 94, ${alpha})`;
  } else {
    const alpha = 0.15 + intensity * 0.6;
    return `rgba(239, 68, 68, ${alpha})`;
  }
}

export default function DailyCalendar({ trades }) {
  const months = useMemo(() => getAvailableMonths(trades), [trades]);

  const [monthIdx, setMonthIdx] = useState(() => {
    return months.length > 0 ? months.length - 1 : 0;
  });

  const currentMonth = months[monthIdx] || format(new Date(), 'yyyy-MM');
  const [year, month] = currentMonth.split('-').map(Number);

  const calendarDays = useMemo(
    () => getMonthlyCalendar(trades, year, month - 1),
    [trades, year, month]
  );

  const maxAbsProfit = useMemo(() => {
    return Math.max(...calendarDays.map((d) => Math.abs(d.profit)), 1);
  }, [calendarDays]);

  const monthProfit = calendarDays.reduce((s, d) => s + d.profit, 0);
  const monthTrades = calendarDays.reduce((s, d) => s + d.trades, 0);
  const tradingDays = calendarDays.filter((d) => d.trades > 0).length;
  const winDays = calendarDays.filter((d) => d.profit > 0).length;

  // Pad the start to align with correct weekday
  const firstDayOfWeek = calendarDays.length > 0 ? calendarDays[0].dayOfWeek : 0;
  const paddedDays = [...Array(firstDayOfWeek).fill(null), ...calendarDays];

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setMonthIdx((i) => Math.max(0, i - 1))}
          disabled={monthIdx <= 0}
          className="p-2 rounded-lg bg-surface-light border border-border text-text-muted hover:text-text disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h3 className="text-xl font-semibold text-text">
            {format(new Date(year, month - 1), 'MMMM yyyy')}
          </h3>
          <div className="flex gap-4 mt-1 justify-center text-xs text-text-muted">
            <span>{tradingDays} trading days</span>
            <span>{monthTrades} trades</span>
            <span className={monthProfit >= 0 ? 'text-profit' : 'text-loss'}>
              {monthProfit >= 0 ? '+' : ''}{monthProfit.toFixed(2)}
            </span>
          </div>
        </div>

        <button
          onClick={() => setMonthIdx((i) => Math.min(months.length - 1, i + 1))}
          disabled={monthIdx >= months.length - 1}
          className="p-2 rounded-lg bg-surface-light border border-border text-text-muted hover:text-text disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-text-muted py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {paddedDays.map((day, i) => {
          if (!day) {
            return <div key={`pad-${i}`} className="aspect-square" />;
          }

          const isTrading = day.trades > 0;
          const bgColor = isTrading ? getProfitColor(day.profit, maxAbsProfit) : '';

          return (
            <div
              key={day.dateKey}
              className={`aspect-square rounded-xl p-1.5 flex flex-col items-center justify-center transition-all
                ${isTrading ? 'border border-border/50 hover:scale-105 cursor-default' : 'opacity-40'}
              `}
              style={{ backgroundColor: bgColor }}
              title={isTrading ? `${day.dateKey}\n${day.trades} trades | P/L: ${day.profit.toFixed(2)}\nWins: ${day.wins} | Losses: ${day.losses}` : day.dateKey}
            >
              <span className="text-xs font-medium text-text">
                {format(day.date, 'd')}
              </span>
              {isTrading && (
                <>
                  <span className={`text-xs font-bold mt-0.5 ${day.profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {day.profit >= 0 ? '+' : ''}{day.profit.toFixed(0)}
                  </span>
                  <span className="text-[10px] text-text-muted">{day.trades}t</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Month summary bar */}
      {tradingDays > 0 && (
        <div className="mt-6 grid grid-cols-4 gap-3">
          {[
            { label: 'Win Days', value: `${winDays}/${tradingDays}`, sub: `${((winDays / tradingDays) * 100).toFixed(0)}%` },
            { label: 'Avg Day', value: (monthProfit / tradingDays).toFixed(2), color: monthProfit / tradingDays >= 0 },
            { label: 'Best Day', value: Math.max(...calendarDays.map(d => d.profit)).toFixed(2), color: true },
            { label: 'Worst Day', value: Math.min(...calendarDays.map(d => d.profit)).toFixed(2), color: false },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface-light rounded-xl p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">{stat.label}</p>
              <p className={`text-sm font-bold mt-1 ${
                stat.color === undefined ? 'text-text' : stat.color ? 'text-profit' : 'text-loss'
              }`}>
                {stat.value}
              </p>
              {stat.sub && <p className="text-[10px] text-text-muted">{stat.sub}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
