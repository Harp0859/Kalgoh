import { CARD } from '../../shared/StatCard';

export default function HourlyHeatmap({ hourlyStats }) {
  const active = hourlyStats.filter((h) => h.trades > 0);
  if (active.length === 0) return null;

  const maxProfit = Math.max(...hourlyStats.map((x) => Math.abs(x.profit)), 1);
  const best = active.reduce((a, b) => a.profit > b.profit ? a : b);
  const worst = active.reduce((a, b) => a.profit < b.profit ? a : b);
  const busiest = active.reduce((a, b) => a.trades > b.trades ? a : b);

  return (
    <div className={CARD}>
      <div className="mb-4 lg:mb-5">
        <h3 className="text-sm lg:text-base font-semibold text-text-light">Hourly Performance</h3>
        <p className="text-[10px] lg:text-xs text-text-card-muted mt-0.5">Which hours are you most profitable</p>
      </div>
      <div className="grid grid-cols-6 lg:grid-cols-12 gap-1.5">
        {hourlyStats.map((h) => {
          const intensity = h.trades > 0 ? Math.min(Math.abs(h.profit) / maxProfit, 1) : 0;
          const alpha = h.trades > 0 ? 0.15 + intensity * 0.6 : 0;
          const bg = h.trades === 0 ? 'rgba(255,255,255,0.02)' : h.profit >= 0 ? `rgba(74, 222, 128, ${alpha})` : `rgba(248, 113, 113, ${alpha})`;
          return (
            <div key={h.hour} className="flex flex-col items-center gap-0.5 lg:gap-1 py-1.5 lg:py-2 rounded-lg lg:rounded-xl cursor-default" style={{ backgroundColor: bg }} title={`${h.hour}:00 — ${h.trades} trades, $${h.profit.toFixed(2)}`}>
              <span className="text-[9px] lg:text-[10px] text-text-card-muted font-medium">{h.hour}</span>
              {h.trades > 0 ? (
                <>
                  <span className={`text-[10px] lg:text-xs font-bold ${h.profit >= 0 ? 'text-profit' : 'text-loss'}`}>{h.profit >= 0 ? '+' : ''}{h.profit.toFixed(0)}</span>
                  <span className="text-[8px] lg:text-[9px] text-text-card-muted">{h.trades}t</span>
                </>
              ) : (
                <span className="text-[8px] lg:text-[9px] text-text-card-muted">--</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 lg:gap-4 mt-3 lg:mt-4 text-[10px] lg:text-xs">
        <div className="bg-card-lighter rounded-lg px-2 lg:px-3 py-1.5 lg:py-2"><span className="text-text-card-muted">Best </span><span className="text-profit font-bold">{best.hour}:00</span></div>
        <div className="bg-card-lighter rounded-lg px-2 lg:px-3 py-1.5 lg:py-2"><span className="text-text-card-muted">Worst </span><span className="text-loss font-bold">{worst.hour}:00</span></div>
        <div className="bg-card-lighter rounded-lg px-2 lg:px-3 py-1.5 lg:py-2"><span className="text-text-card-muted">Busiest </span><span className="text-accent-blue font-bold">{busiest.hour}:00</span></div>
      </div>
    </div>
  );
}
