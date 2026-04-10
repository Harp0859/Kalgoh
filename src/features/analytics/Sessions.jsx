import { Globe } from 'lucide-react';
import { CARD } from '../../shared/StatCard';

const fmtMoney = (n) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Sessions({ sessionStats }) {
  if (!sessionStats || sessionStats.length === 0) return null;

  return (
    <div className={CARD} aria-label="Trading session performance breakdown">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-4 h-4 text-text-card-muted" aria-hidden="true" />
        <h3 className="text-base font-semibold text-text-light">Sessions</h3>
      </div>
      <div className="space-y-2.5">
        {sessionStats.map((s) => {
          const winRate = s.trades > 0 ? (s.wins / s.trades) * 100 : 0;
          return (
            <div key={s.name} className="bg-card-lighter rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-light">{s.name}</p>
                  <p className="text-xs text-text-card-muted mt-0.5 tabular-nums">{s.hours} UTC &middot; {s.trades}t &middot; {winRate.toFixed(0)}%</p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${s.profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {s.profit >= 0 ? '+' : '-'}${fmtMoney(Math.abs(s.profit))}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
