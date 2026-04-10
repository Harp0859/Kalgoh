import { CARD } from '../../shared/StatCard';

export default function Symbols({ symbolStats }) {
  if (!symbolStats || symbolStats.length === 0) return null;

  return (
    <div className={CARD}>
      <h3 className="text-base font-semibold text-text-light mb-4">Symbols</h3>
      <div className="space-y-2">
        {symbolStats.slice(0, 8).map((s) => {
          const winRate = s.trades > 0 ? (s.wins / s.trades) * 100 : 0;
          return (
            <div key={s.symbol} className="bg-card-lighter rounded-xl p-3 relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-profit/[0.06] rounded-xl" style={{ width: `${winRate}%` }} />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-light">{s.symbol}</p>
                  <p className="text-[11px] text-text-card-muted mt-0.5">{s.trades} trades &middot; {winRate.toFixed(0)}% win</p>
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
