import { CARD } from '../../shared/StatCard';

const fmtMoney = (n) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Symbols({ symbolStats }) {
  if (!symbolStats || symbolStats.length === 0) return null;

  return (
    <div className={CARD} aria-label="Top traded symbols with profit and win rate">
      <h3 className="text-base font-semibold text-text-light mb-4">Symbols</h3>
      <div className="space-y-2">
        {symbolStats.slice(0, 8).map((s) => {
          const winRate = s.trades > 0 ? (s.wins / s.trades) * 100 : 0;
          return (
            <div key={s.symbol} className="bg-card-lighter rounded-xl p-3 relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-profit/[0.06] rounded-xl" style={{ width: `${winRate}%` }} aria-hidden="true" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-light">{s.symbol}</p>
                  <p className="text-xs text-text-card-muted mt-0.5 tabular-nums">{s.trades} trades &middot; {winRate.toFixed(0)}% win</p>
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
