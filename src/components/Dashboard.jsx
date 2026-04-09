import { useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, TrendingDown, Target, BarChart3, Activity, Zap } from 'lucide-react';
import { getSummaryStats } from '../utils/tradeStats';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          color === 'profit' ? 'bg-profit/10' : color === 'loss' ? 'bg-loss/10' : 'bg-primary/10'
        }`}>
          <Icon className={`w-4 h-4 ${
            color === 'profit' ? 'text-profit' : color === 'loss' ? 'text-loss' : 'text-primary'
          }`} />
        </div>
        <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xl font-bold ${
        color === 'profit' ? 'text-profit' : color === 'loss' ? 'text-loss' : 'text-text'
      }`}>
        {value}
      </p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-light border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-text-muted mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard({ trades }) {
  const stats = useMemo(() => getSummaryStats(trades), [trades]);

  const winRateData = [
    { name: 'Wins', value: stats.wins, color: '#22c55e' },
    { name: 'Losses', value: stats.losses, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={TrendingUp}
          label="Net Profit"
          value={`$${stats.netProfit.toFixed(2)}`}
          color={stats.netProfit >= 0 ? 'profit' : 'loss'}
        />
        <StatCard
          icon={Target}
          label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          sub={`${stats.wins}W / ${stats.losses}L`}
          color={stats.winRate >= 50 ? 'profit' : 'loss'}
        />
        <StatCard
          icon={BarChart3}
          label="Total Trades"
          value={stats.totalTrades}
          color="primary"
        />
        <StatCard
          icon={Activity}
          label="Profit Factor"
          value={stats.profitFactor === Infinity ? 'N/A' : stats.profitFactor.toFixed(2)}
          color={stats.profitFactor >= 1 ? 'profit' : 'loss'}
        />
        <StatCard
          icon={TrendingUp}
          label="Best Trade"
          value={`$${stats.bestTrade.toFixed(2)}`}
          color="profit"
        />
        <StatCard
          icon={TrendingDown}
          label="Max Drawdown"
          value={`$${stats.maxDrawdown.toFixed(2)}`}
          color="loss"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity Curve */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-text mb-4">Equity Curve</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.equityCurve}>
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f5c" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="balance" stroke="#6366f1" fill="url(#equityGrad)" strokeWidth={2} name="Balance" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Win Rate Pie */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-text mb-4">Win / Loss Ratio</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={winRateData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {winRateData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-profit" />
              <span className="text-xs text-text-muted">Wins ({stats.wins})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-loss" />
              <span className="text-xs text-text-muted">Losses ({stats.losses})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily P/L Bar Chart */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h3 className="text-sm font-medium text-text mb-4">Daily P/L</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={stats.dailyPnL}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f5c" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="profit" name="P/L" radius={[3, 3, 0, 0]}>
              {stats.dailyPnL.map((entry, i) => (
                <Cell key={i} fill={entry.profit >= 0 ? '#22c55e' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Symbol Breakdown */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h3 className="text-sm font-medium text-text mb-4">Symbol Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-muted uppercase">
                <th className="text-left pb-3">Symbol</th>
                <th className="text-right pb-3">Trades</th>
                <th className="text-right pb-3">Win Rate</th>
                <th className="text-right pb-3">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.symbolStats.map((s) => (
                <tr key={s.symbol} className="hover:bg-surface-light/50">
                  <td className="py-2.5 font-medium text-text">{s.symbol}</td>
                  <td className="py-2.5 text-right text-text-muted">{s.trades}</td>
                  <td className="py-2.5 text-right text-text-muted">
                    {s.trades > 0 ? ((s.wins / s.trades) * 100).toFixed(0) : 0}%
                  </td>
                  <td className={`py-2.5 text-right font-medium ${s.profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {s.profit >= 0 ? '+' : ''}{s.profit.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
