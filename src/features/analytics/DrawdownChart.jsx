import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from '../../shared/ChartTooltip';
import { CARD } from '../../shared/StatCard';

const fmtMoney = (n) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DrawdownChart({ drawdownCurve, maxDrawdown }) {
  if (!drawdownCurve || drawdownCurve.length === 0) return null;

  return (
    <div className={CARD} aria-label={`Drawdown chart showing distance from equity peak, maximum drawdown $${fmtMoney(maxDrawdown)}`}>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-text-light">Drawdown</h3>
        <p className="text-xs text-text-card-muted mt-0.5 tabular-nums">Distance from equity peak &middot; Max: -${fmtMoney(maxDrawdown)}</p>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={drawdownCurve} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-loss)" stopOpacity={0} />
              <stop offset="100%" stopColor="var(--color-loss)" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6a6a64' }} tickFormatter={(v) => v.slice(5)} axisLine={{ stroke: '#2a2a2a' }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#6a6a64' }} tickFormatter={(v) => `$${v.toLocaleString()}`} axisLine={false} tickLine={false} width={55} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#6a6a64', strokeDasharray: '3 3' }} />
          <Area type="monotone" dataKey="drawdown" stroke="var(--color-loss)" fill="url(#ddGrad)" strokeWidth={1.5} name="Drawdown" animationDuration={600} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-1.5 mt-2 text-xs">
        <div className="w-3 h-0.5 rounded-full bg-loss" aria-hidden="true" />
        <span className="text-text-card-muted">Drawdown from peak ($)</span>
      </div>
    </div>
  );
}
