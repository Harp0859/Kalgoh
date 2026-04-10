import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from '../../shared/ChartTooltip';
import { CARD } from '../../shared/StatCard';

export default function DrawdownChart({ drawdownCurve, maxDrawdown }) {
  if (!drawdownCurve || drawdownCurve.length === 0) return null;

  return (
    <div className={CARD}>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-text-light">Drawdown</h3>
        <p className="text-xs text-text-card-muted mt-0.5">Distance from equity peak &middot; Max: ${maxDrawdown.toFixed(2)}</p>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={drawdownCurve}>
          <defs>
            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f87171" stopOpacity={0} />
              <stop offset="100%" stopColor="#f87171" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6a6a64' }} tickFormatter={(v) => v.slice(5)} axisLine={{ stroke: '#2a2a2a' }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#6a6a64' }} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#6a6a64', strokeDasharray: '3 3' }} />
          <Area type="monotone" dataKey="drawdown" stroke="#f87171" fill="url(#ddGrad)" strokeWidth={1.5} name="Drawdown" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
