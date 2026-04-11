import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartTooltip } from '../../shared/ChartTooltip';
import { CARD } from '../../shared/StatCard';

const fmtMoney = (n) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtMoneySigned = (n) => {
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return `${sign}$${fmtMoney(Math.abs(n))}`;
};

export default function TradeDistribution({ distribution, avgWin, avgLoss, expectancy }) {
  if (!distribution || distribution.length === 0) return null;

  return (
    <div className={CARD} aria-label="Trade distribution histogram showing how trade profits are spread across ranges">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-text-light">Trade Distribution</h3>
        <p className="text-xs text-text-card-muted mt-0.5">How your trade profits are spread</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={distribution} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6a6a64' }} axisLine={{ stroke: '#2a2a2a' }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#6a6a64' }} axisLine={false} tickLine={false} width={35} label={{ value: 'Trades', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#6a6a64' } }} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="count" name="Trades" radius={[3, 3, 0, 0]} animationDuration={600} activeBar={{ fill: 'rgba(255,255,255,0.12)', radius: [3, 3, 0, 0] }}>
            {distribution.map((entry, i) => (
              <Cell key={i} fill={entry.mid >= 0 ? 'var(--color-profit)' : 'var(--color-loss)'} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-3 mt-1 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-profit/70" aria-hidden="true" />
          <span className="text-text-card-muted">Winning buckets</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-loss/70" aria-hidden="true" />
          <span className="text-text-card-muted">Losing buckets</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 lg:gap-3 mt-3 text-xs">
        <div className="bg-card-lighter rounded-lg px-3 py-2">
          <span className="text-text-card-muted">Avg Win </span>
          <span className="text-profit font-bold tabular-nums">+${fmtMoney(avgWin)}</span>
        </div>
        <div className="bg-card-lighter rounded-lg px-3 py-2">
          <span className="text-text-card-muted">Avg Loss </span>
          <span className="text-loss font-bold tabular-nums">-${fmtMoney(avgLoss)}</span>
        </div>
        <div className="bg-card-lighter rounded-lg px-3 py-2">
          <span className="text-text-card-muted">Expectancy </span>
          <span className={`font-bold tabular-nums ${expectancy >= 0 ? 'text-profit' : 'text-loss'}`}>{fmtMoneySigned(expectancy)}</span>
        </div>
      </div>
    </div>
  );
}
