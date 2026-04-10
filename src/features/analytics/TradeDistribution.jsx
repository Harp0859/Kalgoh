import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { ChartTooltip } from '../../shared/ChartTooltip';
import { CARD } from '../../shared/StatCard';

export default function TradeDistribution({ distribution, avgWin, avgLoss, expectancy }) {
  if (!distribution || distribution.length === 0) return null;

  return (
    <div className={CARD}>
      <div className="mb-5">
        <h3 className="text-base font-semibold text-text-light">Trade Distribution</h3>
        <p className="text-xs text-text-card-muted mt-0.5">How your trade profits are spread</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={distribution}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#6a6a64' }} axisLine={{ stroke: '#2a2a2a' }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#6a6a64' }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="count" name="Trades" radius={[3, 3, 0, 0]} activeBar={{ fill: 'rgba(255,255,255,0.12)', radius: [3, 3, 0, 0] }}>
            {distribution.map((entry, i) => (
              <Cell key={i} fill={entry.mid >= 0 ? '#4ade80' : '#f87171'} fillOpacity={0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3 text-xs">
        <div className="bg-card-lighter rounded-lg px-3 py-2">
          <span className="text-text-card-muted">Avg Win </span><span className="text-profit font-bold">${avgWin.toFixed(2)}</span>
        </div>
        <div className="bg-card-lighter rounded-lg px-3 py-2">
          <span className="text-text-card-muted">Avg Loss </span><span className="text-loss font-bold">-${avgLoss.toFixed(2)}</span>
        </div>
        <div className="bg-card-lighter rounded-lg px-3 py-2">
          <span className="text-text-card-muted">Expectancy </span>
          <span className={`font-bold ${expectancy >= 0 ? 'text-profit' : 'text-loss'}`}>${expectancy.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
