import { CalendarDays } from 'lucide-react';
import { CARD } from '../../shared/StatCard';

const fmtMoney = (n) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DayOfWeek({ dayOfWeekStats }) {
  const active = dayOfWeekStats.filter((d) => d.trades > 0);
  if (active.length === 0) return null;

  const maxP = Math.max(...dayOfWeekStats.map((x) => Math.abs(x.profit)), 1);

  return (
    <div className={CARD} aria-label="Day of week performance bars">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="w-4 h-4 text-text-card-muted" aria-hidden="true" />
        <h3 className="text-base font-semibold text-text-light">Day of Week</h3>
      </div>
      <div className="space-y-2">
        {active.map((d) => {
          const barWidth = Math.min(Math.abs(d.profit) / maxP * 100, 100);
          return (
            <div key={d.day} className="flex items-center gap-3">
              <span className="text-xs text-text-card-muted w-8 font-medium">{d.dayName}</span>
              <div className="flex-1 h-7 bg-card-lighter rounded-lg relative overflow-hidden">
                <div className={`absolute inset-y-0 left-0 rounded-lg ${d.profit >= 0 ? 'bg-profit/20' : 'bg-loss/20'}`} style={{ width: `${barWidth}%` }} aria-hidden="true" />
                <div className="absolute inset-0 flex items-center justify-between px-2.5">
                  <span className="text-xs text-text-card-muted tabular-nums">{d.trades}t</span>
                  <span className={`text-xs font-bold tabular-nums ${d.profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {d.profit >= 0 ? '+' : '-'}${fmtMoney(Math.abs(d.profit))}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
