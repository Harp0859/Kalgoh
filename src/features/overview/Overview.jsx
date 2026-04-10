import { useMemo } from 'react';
import { ComposedChart, Area, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, ReferenceLine } from 'recharts';
import { Target, Activity, Flame, TrendingUp, TrendingDown, Zap, Clock, Timer, Wallet, Percent } from 'lucide-react';
import { StatCard, HeroStat, CARD } from '../../shared/StatCard';
import { EquityTooltip, ChartTooltip } from '../../shared/ChartTooltip';
import { formatDuration } from '../../utils/tradeStats';
import TodayCard from './TodayCard';

export default function Overview({ stats, startingBalance, hasBalanceOps, trades }) {
  const isPositive = stats.netProfit >= 0;
  const gradientColor = isPositive ? '#4ade80' : '#f87171';
  const lastBalance = stats.equityCurve.length > 0 ? stats.equityCurve[stats.equityCurve.length - 1].balance : startingBalance;

  const winRateData = [
    { name: 'Wins', value: stats.wins, color: '#4ade80' },
    { name: 'Losses', value: stats.losses, color: '#f87171' },
  ];

  return (
    <div className="space-y-4 lg:space-y-5">
      <TodayCard trades={trades} />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <HeroStat label="Net Profit" value={`$${stats.netProfit.toFixed(2)}`} sub={`${stats.totalTrades} trades \u00b7 ${stats.wins}W / ${stats.losses}L`} isPositive={isPositive} />
        <StatCard icon={Target} label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} sub={`${stats.wins}W / ${stats.losses}L`} accent={stats.winRate >= 50 ? 'profit' : 'loss'} />
        <StatCard icon={Activity} label="Profit Factor" value={stats.profitFactor === Infinity ? '--' : stats.profitFactor.toFixed(2)} sub="Avg win / avg loss" accent={stats.profitFactor >= 1 ? 'profit' : 'loss'} />
      </div>

      {/* Balance pills */}
      {startingBalance > 0 && (
        <div className="flex flex-wrap gap-2 lg:gap-4">
          <div className="flex items-center gap-2 bg-card rounded-xl px-3 lg:px-4 py-2">
            <Wallet className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-text-card-muted" />
            <span className="text-[10px] lg:text-xs text-text-card-muted">Start</span>
            <span className="text-xs lg:text-sm font-bold text-text-light">${startingBalance.toFixed(0)}</span>
          </div>
          <div className="flex items-center gap-2 bg-card rounded-xl px-3 lg:px-4 py-2">
            <Wallet className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-text-card-muted" />
            <span className="text-[10px] lg:text-xs text-text-card-muted">Current</span>
            <span className={`text-xs lg:text-sm font-bold ${lastBalance >= startingBalance ? 'text-profit' : 'text-loss'}`}>${lastBalance.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2 bg-card rounded-xl px-3 lg:px-4 py-2">
            <Percent className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-text-card-muted" />
            <span className="text-[10px] lg:text-xs text-text-card-muted">Growth</span>
            <span className={`text-xs lg:text-sm font-bold ${stats.growthPct >= 0 ? 'text-profit' : 'text-loss'}`}>{stats.growthPct >= 0 ? '+' : ''}{stats.growthPct.toFixed(1)}%</span>
          </div>
          {stats.totalDeposits > 0 && (
            <div className="flex items-center gap-2 bg-card rounded-xl px-3 lg:px-4 py-2">
              <TrendingUp className="w-3 h-3 text-accent-blue" />
              <span className="text-[10px] lg:text-xs text-text-card-muted">In</span>
              <span className="text-xs lg:text-sm font-bold text-accent-blue">${stats.totalDeposits.toFixed(0)}</span>
            </div>
          )}
          {stats.totalWithdrawals > 0 && (
            <div className="flex items-center gap-2 bg-card rounded-xl px-3 lg:px-4 py-2">
              <TrendingDown className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] lg:text-xs text-text-card-muted">Out</span>
              <span className="text-xs lg:text-sm font-bold text-yellow-400">${stats.totalWithdrawals.toFixed(0)}</span>
            </div>
          )}
        </div>
      )}

      {/* Equity Curve */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4 lg:mb-5">
          <div>
            <h3 className="text-sm lg:text-base font-semibold text-text-light">Equity Curve</h3>
            <p className="text-[10px] lg:text-xs text-text-card-muted mt-0.5">{startingBalance > 0 ? `From $${startingBalance.toFixed(0)}` : 'Running balance'}</p>
          </div>
          <div className="text-right">
            <p className={`text-xl lg:text-3xl font-bold tracking-tight ${isPositive ? 'text-profit' : 'text-loss'}`}>${lastBalance.toFixed(2)}</p>
            <p className="text-[9px] lg:text-[10px] text-text-card-muted">{startingBalance > 0 ? `${stats.growthPct >= 0 ? '+' : ''}${stats.growthPct.toFixed(1)}% trading` : 'Balance'}</p>
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
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6a6a64' }} tickFormatter={(v) => v.slice(5)} axisLine={{ stroke: '#2a2a2a' }} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#6a6a64' }} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} width={45} />
            <Tooltip content={<EquityTooltip />} cursor={{ stroke: '#6a6a64', strokeDasharray: '3 3' }} />
            {startingBalance > 0 && <ReferenceLine y={startingBalance} stroke="#6a6a64" strokeDasharray="4 4" />}
            {stats.equityCurve.filter((d) => d.balanceOp > 0).map((d, i) => (
              <ReferenceLine key={`d${i}`} x={d.date} stroke="#60a5fa" strokeDasharray="3 3" strokeOpacity={0.4} />
            ))}
            {stats.equityCurve.filter((d) => d.balanceOp < 0).map((d, i) => (
              <ReferenceLine key={`w${i}`} x={d.date} stroke="#fbbf24" strokeDasharray="3 3" strokeOpacity={0.4} />
            ))}
            <Area type="monotone" dataKey="balance" stroke={gradientColor} fill="url(#eqGrad)" strokeWidth={2} name="Balance" animationDuration={1500} />
            {hasBalanceOps && <Line type="monotone" dataKey="tradingEquity" stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Trading P/L" />}
          </ComposedChart>
        </ResponsiveContainer>
        {hasBalanceOps && (
          <div className="flex flex-wrap items-center gap-3 lg:gap-5 mt-3 text-[10px] lg:text-[11px]">
            <div className="flex items-center gap-1.5"><div className="w-3 lg:w-4 h-0.5 rounded-full" style={{ backgroundColor: gradientColor }} /><span className="text-text-card-muted">Balance</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 lg:w-4 h-0 border-t-[1.5px] border-dashed border-accent-blue" /><span className="text-text-card-muted">Trading</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-blue" /><span className="text-text-card-muted">Deposit</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-400" /><span className="text-text-card-muted">Withdrawal</span></div>
          </div>
        )}
      </div>

      {/* Daily P/L + Win/Loss */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        <div className={`lg:col-span-2 ${CARD}`}>
          <div className="mb-4">
            <h3 className="text-sm lg:text-base font-semibold text-text-light">Daily P/L</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.dailyPnL}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6a6a64' }} tickFormatter={(v) => v.slice(5)} axisLine={{ stroke: '#2a2a2a' }} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#6a6a64' }} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <ReferenceLine y={0} stroke="#444" />
              <Bar dataKey="profit" name="P/L" radius={[3, 3, 0, 0]} animationDuration={1200} activeBar={{ fill: 'rgba(255,255,255,0.12)', radius: [3, 3, 0, 0] }}>
                {stats.dailyPnL.map((entry, i) => <Cell key={i} fill={entry.profit >= 0 ? '#4ade80' : '#f87171'} fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Win/Loss + Streaks + Duration */}
        <div className={CARD}>
          <h3 className="text-sm lg:text-base font-semibold text-text-light mb-2">Win / Loss</h3>
          <div className="flex items-center justify-center my-3">
            <div className="relative">
              <ResponsiveContainer width={150} height={150}>
                <PieChart>
                  <Pie data={winRateData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {winRateData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl lg:text-2xl font-bold ${stats.winRate >= 50 ? 'text-profit' : 'text-loss'}`}>{stats.winRate.toFixed(0)}%</span>
                <span className="text-[9px] text-text-card-muted">Win Rate</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border-card space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-profit" /><span className="text-[11px] text-text-card-muted">Win streak</span></div>
              <span className="text-sm font-bold text-profit">{stats.streaks.liveWinStreak}<span className="text-text-card-muted font-normal text-[10px]"> / {stats.streaks.maxWinStreak}</span></span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-loss" /><span className="text-[11px] text-text-card-muted">Loss streak</span></div>
              <span className="text-sm font-bold text-loss">{stats.streaks.liveLossStreak}<span className="text-text-card-muted font-normal text-[10px]"> / {stats.streaks.maxLossStreak}</span></span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-border-card space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Timer className="w-3.5 h-3.5 text-accent-blue" /><span className="text-[11px] text-text-card-muted">Avg hold</span></div>
              <span className="text-sm font-bold text-text-light">{formatDuration(stats.durationStats.avgMinutes)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-profit" /><span className="text-[11px] text-text-card-muted">Fastest</span></div>
              <span className="text-xs font-medium text-text-card-muted">{formatDuration(stats.durationStats.minMinutes)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-text-card-muted" /><span className="text-[11px] text-text-card-muted">Longest</span></div>
              <span className="text-xs font-medium text-text-card-muted">{formatDuration(stats.durationStats.maxMinutes)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
