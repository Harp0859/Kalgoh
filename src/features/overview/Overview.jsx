import { useMemo } from 'react';
import { ComposedChart, Area, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, ReferenceLine } from 'recharts';
import { Target, Activity, Flame, TrendingUp, TrendingDown, Zap, Clock, Timer, Wallet, Percent } from 'lucide-react';
import { StatCard, HeroStat, CARD } from '../../shared/StatCard';
import { EquityTooltip, ChartTooltip } from '../../shared/ChartTooltip';
import { formatDuration } from '../../utils/tradeStats';
import TodayCard from './TodayCard';

const fmtMoney = (n) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtMoneySigned = (n) => {
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return `${sign}$${fmtMoney(Math.abs(n))}`;
};

const fmtMoneyCompact = (n) =>
  n.toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function Overview({ stats, startingBalance, hasBalanceOps, trades }) {
  const isPositive = stats.netProfit >= 0;
  const gradientColor = isPositive ? 'var(--color-profit)' : 'var(--color-loss)';
  const lastBalance = stats.equityCurve.length > 0 ? stats.equityCurve[stats.equityCurve.length - 1].balance : startingBalance;

  const winRateData = [
    { name: 'Wins', value: stats.wins, color: 'var(--color-profit)' },
    { name: 'Losses', value: stats.losses, color: 'var(--color-loss)' },
  ];

  return (
    <div className="space-y-4 lg:space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <TodayCard trades={trades} />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <HeroStat
          label="Net Profit"
          value={fmtMoneySigned(stats.netProfit)}
          sub={`${stats.totalTrades} trades \u00b7 ${stats.wins}W / ${stats.losses}L`}
          isPositive={isPositive}
        />
        <StatCard icon={Target} label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} sub={`${stats.wins}W / ${stats.losses}L`} accent={stats.winRate >= 50 ? 'profit' : 'loss'} />
        <StatCard icon={Activity} label="Profit Factor" value={stats.profitFactor === Infinity ? '--' : stats.profitFactor.toFixed(2)} sub="Avg win / avg loss" accent={stats.profitFactor >= 1 ? 'profit' : 'loss'} />
      </div>

      {/* Balance pills */}
      {startingBalance > 0 && (
        <div className="flex flex-wrap gap-2 lg:gap-4">
          <div className="card-premium flex items-center gap-2 bg-card rounded-xl px-3 lg:px-4 py-2">
            <Wallet className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-text-card-muted" aria-hidden="true" />
            <span className="text-xs text-text-card-muted">Start</span>
            <span className="text-xs lg:text-sm font-bold text-text-light tabular-nums">${fmtMoneyCompact(startingBalance)}</span>
          </div>
          <div className="card-premium flex items-center gap-2 bg-card rounded-xl px-3 lg:px-4 py-2">
            <Wallet className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-text-card-muted" aria-hidden="true" />
            <span className="text-xs text-text-card-muted">Current</span>
            <span className={`text-xs lg:text-sm font-bold tabular-nums ${lastBalance >= startingBalance ? 'text-profit' : 'text-loss'}`}>${fmtMoney(lastBalance)}</span>
          </div>
          <div className="card-premium flex items-center gap-2 bg-card rounded-xl px-3 lg:px-4 py-2">
            <Percent className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-text-card-muted" aria-hidden="true" />
            <span className="text-xs text-text-card-muted">Growth</span>
            <span className={`text-xs lg:text-sm font-bold tabular-nums ${stats.growthPct >= 0 ? 'text-profit' : 'text-loss'}`}>{stats.growthPct >= 0 ? '+' : ''}{stats.growthPct.toFixed(1)}%</span>
          </div>
          {stats.totalDeposits > 0 && (
            <div className="card-premium flex items-center gap-2 bg-card rounded-xl px-3 lg:px-4 py-2">
              <TrendingUp className="w-3 h-3 text-accent-blue" aria-hidden="true" />
              <span className="text-xs text-text-card-muted">In</span>
              <span className="text-xs lg:text-sm font-bold text-accent-blue tabular-nums">+${fmtMoneyCompact(stats.totalDeposits)}</span>
            </div>
          )}
          {stats.totalWithdrawals > 0 && (
            <div className="card-premium flex items-center gap-2 bg-card rounded-xl px-3 lg:px-4 py-2">
              <TrendingDown className="w-3 h-3 text-yellow-400" aria-hidden="true" />
              <span className="text-xs text-text-card-muted">Out</span>
              <span className="text-xs lg:text-sm font-bold text-yellow-400 tabular-nums">-${fmtMoneyCompact(stats.totalWithdrawals)}</span>
            </div>
          )}
        </div>
      )}

      {/* Equity Curve */}
      <div className={CARD} aria-label="Equity curve chart showing account balance over time">
        <div className="flex items-center justify-between mb-4 lg:mb-5">
          <div>
            <h3 className="text-sm lg:text-base font-semibold text-text-light">Equity Curve</h3>
            <p className="text-xs text-text-card-muted mt-0.5 tabular-nums">{startingBalance > 0 ? `From $${fmtMoneyCompact(startingBalance)}` : 'Running balance'}</p>
          </div>
          <div className="text-right">
            <p className={`text-xl lg:text-3xl font-bold tracking-tight tabular-nums ${isPositive ? 'text-profit' : 'text-loss'}`}>${fmtMoney(lastBalance)}</p>
            <p className="text-xs text-text-card-muted tabular-nums">{startingBalance > 0 ? `${stats.growthPct >= 0 ? '+' : ''}${stats.growthPct.toFixed(1)}% trading` : 'Balance'}</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" className="chart-equity" height={280}>
          <ComposedChart data={stats.equityCurve}>
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={gradientColor} stopOpacity={0.15} />
                <stop offset="100%" stopColor={gradientColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6a6a64' }} tickFormatter={(v) => v.slice(5)} axisLine={{ stroke: '#2a2a2a' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#6a6a64' }} tickFormatter={(v) => `$${v.toLocaleString()}`} axisLine={false} tickLine={false} width={55} />
            <Tooltip content={<EquityTooltip />} cursor={{ stroke: '#6a6a64', strokeDasharray: '3 3' }} />
            {startingBalance > 0 && <ReferenceLine y={startingBalance} stroke="#6a6a64" strokeDasharray="4 4" />}
            {stats.equityCurve.filter((d) => d.balanceOp > 0).map((d, i) => (
              <ReferenceLine key={`d${i}`} x={d.date} stroke="#60a5fa" strokeDasharray="3 3" strokeOpacity={0.4} />
            ))}
            {stats.equityCurve.filter((d) => d.balanceOp < 0).map((d, i) => (
              <ReferenceLine key={`w${i}`} x={d.date} stroke="#fbbf24" strokeDasharray="3 3" strokeOpacity={0.4} />
            ))}
            <Area type="monotone" dataKey="balance" stroke={gradientColor} fill="url(#eqGrad)" strokeWidth={2} name="Balance" animationDuration={600} />
            {hasBalanceOps && <Line type="monotone" dataKey="tradingEquity" stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Trading P/L" animationDuration={600} />}
          </ComposedChart>
        </ResponsiveContainer>
        {hasBalanceOps && (
          <div className="flex flex-wrap items-center gap-3 lg:gap-5 mt-3 text-xs">
            <div className="flex items-center gap-1.5"><div className="w-3 lg:w-4 h-0.5 rounded-full" style={{ backgroundColor: gradientColor }} /><span className="text-text-card-muted">Balance</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 lg:w-4 h-0 border-t-[1.5px] border-dashed border-accent-blue" /><span className="text-text-card-muted">Trading</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-blue" /><span className="text-text-card-muted">Deposit</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-400" /><span className="text-text-card-muted">Withdrawal</span></div>
          </div>
        )}
      </div>

      {/* Daily P/L + Win/Loss */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        <div className={`lg:col-span-2 ${CARD}`} aria-label="Daily profit and loss bar chart">
          <div className="mb-4">
            <h3 className="text-sm lg:text-base font-semibold text-text-light">Daily P/L</h3>
            <p className="text-xs text-text-card-muted mt-0.5">Green = profit day, red = loss day</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.dailyPnL}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6a6a64' }} tickFormatter={(v) => v.slice(5)} axisLine={{ stroke: '#2a2a2a' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6a6a64' }} tickFormatter={(v) => `$${v.toLocaleString()}`} axisLine={false} tickLine={false} width={50} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <ReferenceLine y={0} stroke="#444" />
              <Bar dataKey="profit" name="P/L" radius={[3, 3, 0, 0]} animationDuration={600} activeBar={{ fill: 'rgba(255,255,255,0.12)', radius: [3, 3, 0, 0] }}>
                {stats.dailyPnL.map((entry, i) => <Cell key={i} fill={entry.profit >= 0 ? 'var(--color-profit)' : 'var(--color-loss)'} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Win/Loss + Streaks + Duration */}
        <div className={CARD} aria-label="Win rate donut chart with streak and duration stats">
          <h3 className="text-sm lg:text-base font-semibold text-text-light mb-2">Win / Loss</h3>
          <div className="flex items-center justify-center my-3">
            <div className="relative">
              <ResponsiveContainer width={150} height={150}>
                <PieChart>
                  <Pie data={winRateData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value" strokeWidth={0} animationDuration={600}>
                    {winRateData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl lg:text-2xl font-bold tabular-nums ${stats.winRate >= 50 ? 'text-profit' : 'text-loss'}`}>{stats.winRate.toFixed(0)}%</span>
                <span className="text-[10px] text-text-card-muted uppercase tracking-wider">Win Rate</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border-card space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-profit" aria-hidden="true" /><span className="text-xs text-text-card-muted">Win streak</span></div>
              <span className="text-sm font-bold text-profit tabular-nums">{stats.streaks.liveWinStreak}<span className="text-text-card-muted font-normal text-xs"> / {stats.streaks.maxWinStreak}</span></span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-loss" aria-hidden="true" /><span className="text-xs text-text-card-muted">Loss streak</span></div>
              <span className="text-sm font-bold text-loss tabular-nums">{stats.streaks.liveLossStreak}<span className="text-text-card-muted font-normal text-xs"> / {stats.streaks.maxLossStreak}</span></span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-border-card space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Timer className="w-3.5 h-3.5 text-accent-blue" aria-hidden="true" /><span className="text-xs text-text-card-muted">Avg hold</span></div>
              <span className="text-sm font-bold text-text-light tabular-nums">{formatDuration(stats.durationStats.avgMinutes)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-profit" aria-hidden="true" /><span className="text-xs text-text-card-muted">Fastest</span></div>
              <span className="text-xs font-medium text-text-card-muted tabular-nums">{formatDuration(stats.durationStats.minMinutes)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-text-card-muted" aria-hidden="true" /><span className="text-xs text-text-card-muted">Longest</span></div>
              <span className="text-xs font-medium text-text-card-muted tabular-nums">{formatDuration(stats.durationStats.maxMinutes)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
