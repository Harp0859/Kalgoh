import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isValid } from 'date-fns';

function safeParseDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

export function getDailyPnL(trades) {
  const daily = {};

  for (const trade of trades) {
    const date = safeParseDate(trade.closeTime) || safeParseDate(trade.openTime);
    if (!date) continue;

    const key = format(date, 'yyyy-MM-dd');
    if (!daily[key]) {
      daily[key] = { date: key, profit: 0, trades: 0, wins: 0, losses: 0 };
    }
    daily[key].profit += trade.profit || 0;
    daily[key].trades += 1;
    if ((trade.profit || 0) > 0) daily[key].wins += 1;
    else if ((trade.profit || 0) < 0) daily[key].losses += 1;
  }

  return Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
}

export function getMonthlyCalendar(trades, year, month) {
  const daily = getDailyPnL(trades);
  const dailyMap = {};
  daily.forEach((d) => { dailyMap[d.date] = d; });

  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(new Date(year, month));
  const days = eachDayOfInterval({ start, end });

  return days.map((day) => {
    const key = format(day, 'yyyy-MM-dd');
    return {
      date: day,
      dateKey: key,
      dayOfWeek: day.getDay(),
      ...(dailyMap[key] || { profit: 0, trades: 0, wins: 0, losses: 0 }),
    };
  });
}

export function getSummaryStats(trades) {
  const totalProfit = trades.reduce((s, t) => s + (t.profit || 0), 0);
  const totalCommission = trades.reduce((s, t) => s + (t.commission || 0), 0);
  const totalSwap = trades.reduce((s, t) => s + (t.swap || 0), 0);
  const wins = trades.filter((t) => (t.profit || 0) > 0);
  const losses = trades.filter((t) => (t.profit || 0) < 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.profit, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.profit, 0) / losses.length) : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
  const bestTrade = trades.length > 0 ? Math.max(...trades.map((t) => t.profit || 0)) : 0;
  const worstTrade = trades.length > 0 ? Math.min(...trades.map((t) => t.profit || 0)) : 0;

  const daily = getDailyPnL(trades);
  const bestDay = daily.length > 0 ? daily.reduce((best, d) => d.profit > best.profit ? d : best, daily[0]) : null;
  const worstDay = daily.length > 0 ? daily.reduce((worst, d) => d.profit < worst.profit ? d : worst, daily[0]) : null;

  // Running balance for equity curve
  let balance = 0;
  const equityCurve = daily.map((d) => {
    balance += d.profit;
    return { date: d.date, balance, profit: d.profit };
  });

  // Max drawdown
  let peak = 0;
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    if (point.balance > peak) peak = point.balance;
    const dd = peak - point.balance;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Symbol breakdown
  const symbolStats = {};
  for (const trade of trades) {
    const sym = trade.symbol || 'Unknown';
    if (!symbolStats[sym]) symbolStats[sym] = { symbol: sym, profit: 0, trades: 0, wins: 0 };
    symbolStats[sym].profit += trade.profit || 0;
    symbolStats[sym].trades += 1;
    if ((trade.profit || 0) > 0) symbolStats[sym].wins += 1;
  }

  return {
    totalTrades: trades.length,
    totalProfit,
    totalCommission,
    totalSwap,
    netProfit: totalProfit + totalCommission + totalSwap,
    wins: wins.length,
    losses: losses.length,
    winRate,
    avgWin,
    avgLoss,
    profitFactor,
    bestTrade,
    worstTrade,
    bestDay,
    worstDay,
    maxDrawdown,
    equityCurve,
    dailyPnL: daily,
    symbolStats: Object.values(symbolStats).sort((a, b) => b.profit - a.profit),
  };
}

export function getAvailableMonths(trades) {
  const months = new Set();
  for (const trade of trades) {
    const date = safeParseDate(trade.closeTime) || safeParseDate(trade.openTime);
    if (!date) continue;
    months.add(format(date, 'yyyy-MM'));
  }
  return [...months].sort();
}
