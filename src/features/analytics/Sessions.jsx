import { Globe } from 'lucide-react';
import { CARD } from '../../shared/StatCard';

export default function Sessions({ sessionStats }) {
  if (!sessionStats || sessionStats.length === 0) return null;

  return (
    <div className={CARD}>
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-4 h-4 text-text-card-muted" />
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
                  <p className="text-[10px] text-text-card-muted mt-0.5">{s.hours} UTC &middot; {s.trades}t &middot; {winRate.toFixed(0)}%</p>
                </div>
                <span className={`text-sm font-bold ${s.profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {s.profit >= 0 ? '+' : ''}${s.profit.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
