import { Target, TrendingDown, Percent, Timer } from 'lucide-react';
import { StatCard } from '../../shared/StatCard';
import { formatDuration } from '../../utils/tradeStats';
import HourlyHeatmap from './HourlyHeatmap';
import DayOfWeek from './DayOfWeek';
import Sessions from './Sessions';
import Symbols from './Symbols';
import DrawdownChart from './DrawdownChart';
import TradeDistribution from './TradeDistribution';

const fmtMoney = (n) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtMoneySigned = (n) => {
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return `${sign}$${fmtMoney(Math.abs(n))}`;
};

export default function Analytics({ stats }) {
  return (
    <div className="space-y-4 lg:space-y-5 animate-[fadeIn_0.3s_ease-out]">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard icon={Percent} label="Expectancy" value={fmtMoneySigned(stats.expectancy)} sub="Per trade" accent={stats.expectancy >= 0 ? 'profit' : 'loss'} />
        <StatCard icon={Target} label="Best Trade" value={`+$${fmtMoney(stats.bestTrade)}`} sub="Single trade" accent="profit" />
        <StatCard icon={TrendingDown} label="Max Drawdown" value={`-$${fmtMoney(stats.maxDrawdown)}`} sub="Trading only" accent="loss" />
        <StatCard icon={Timer} label="Avg Hold" value={formatDuration(stats.durationStats.avgMinutes)} sub={`Med: ${formatDuration(stats.durationStats.medianMinutes)}`} accent="neutral" />
      </div>

      <HourlyHeatmap hourlyStats={stats.hourlyStats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        <DayOfWeek dayOfWeekStats={stats.dayOfWeekStats} />
        <Sessions sessionStats={stats.sessionStats} />
        <Symbols symbolStats={stats.symbolStats} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        <TradeDistribution distribution={stats.tradeDistribution} avgWin={stats.avgWin} avgLoss={stats.avgLoss} expectancy={stats.expectancy} />
        <DrawdownChart drawdownCurve={stats.drawdownCurve} maxDrawdown={stats.maxDrawdown} />
      </div>
    </div>
  );
}
