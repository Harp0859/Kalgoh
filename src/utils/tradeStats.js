import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isValid, differenceInMinutes } from 'date-fns';

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
    if (!daily[key]) daily[key] = { date: key, profit: 0, trades: 0, wins: 0, losses: 0 };
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
    return { date: day, dateKey: key, dayOfWeek: day.getDay(), ...(dailyMap[key] || { profit: 0, trades: 0, wins: 0, losses: 0 }) };
  });
}

function getStreaks(trades) {
  const sorted = [...trades].filter((t) => t.closeTime).sort((a, b) => (a.closeTime || '').localeCompare(b.closeTime || ''));
  let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
  for (const trade of sorted) {
    const p = trade.profit || 0;
    if (p > 0) { currentWinStreak++; currentLossStreak = 0; if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak; }
    else if (p < 0) { currentLossStreak++; currentWinStreak = 0; if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak; }
    else { currentWinStreak = 0; currentLossStreak = 0; }
  }
  return { maxWinStreak, maxLossStreak, liveWinStreak: currentWinStreak, liveLossStreak: currentLossStreak };
}

function getHourlyStats(trades) {
  const hours = {};
  for (let h = 0; h < 24; h++) hours[h] = { hour: h, profit: 0, trades: 0, wins: 0, losses: 0 };
  for (const trade of trades) {
    const date = safeParseDate(trade.closeTime) || safeParseDate(trade.openTime);
    if (!date) continue;
    const h = date.getHours();
    hours[h].profit += trade.profit || 0;
    hours[h].trades += 1;
    if ((trade.profit || 0) > 0) hours[h].wins += 1;
    else if ((trade.profit || 0) < 0) hours[h].losses += 1;
  }
  return Object.values(hours);
}

function getDurationStats(trades) {
  const durations = [];
  for (const trade of trades) {
    const open = safeParseDate(trade.openTime);
    const close = safeParseDate(trade.closeTime);
    if (!open || !close) continue;
    const mins = differenceInMinutes(close, open);
    if (mins >= 0) durations.push({ minutes: mins, profit: trade.profit || 0 });
  }
  if (durations.length === 0) return { avgMinutes: 0, minMinutes: 0, maxMinutes: 0, medianMinutes: 0, durations: [] };
  const sorted = durations.map((d) => d.minutes).sort((a, b) => a - b);
  const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  return { avgMinutes: avg, minMinutes: sorted[0], maxMinutes: sorted[sorted.length - 1], medianMinutes: sorted[Math.floor(sorted.length / 2)], durations };
}

/**
 * Day-of-week performance (0=Sun ... 6=Sat)
 */
function getDayOfWeekStats(trades) {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const stats = {};
  for (let d = 0; d < 7; d++) stats[d] = { day: d, dayName: DAYS[d], profit: 0, trades: 0, wins: 0, losses: 0 };

  for (const trade of trades) {
    const date = safeParseDate(trade.closeTime) || safeParseDate(trade.openTime);
    if (!date) continue;
    const d = date.getDay();
    stats[d].profit += trade.profit || 0;
    stats[d].trades += 1;
    if ((trade.profit || 0) > 0) stats[d].wins += 1;
    else if ((trade.profit || 0) < 0) stats[d].losses += 1;
  }
  return Object.values(stats);
}

/**
 * Session breakdown: Asian (00:00-08:00 UTC), London (08:00-16:00 UTC), New York (13:00-21:00 UTC)
 * Note: sessions overlap (London/NY). We assign by trade open time hour.
 */
function getSessionStats(trades) {
  const sessions = {
    asian:   { name: 'Asian',    profit: 0, trades: 0, wins: 0, losses: 0, hours: '00:00 - 08:00' },
    london:  { name: 'London',   profit: 0, trades: 0, wins: 0, losses: 0, hours: '08:00 - 16:00' },
    newyork: { name: 'New York', profit: 0, trades: 0, wins: 0, losses: 0, hours: '13:00 - 21:00' },
    offhours:{ name: 'Off Hours', profit: 0, trades: 0, wins: 0, losses: 0, hours: '21:00 - 00:00' },
  };

  for (const trade of trades) {
    const date = safeParseDate(trade.openTime) || safeParseDate(trade.closeTime);
    if (!date) continue;
    const h = date.getUTCHours();
    const p = trade.profit || 0;

    let session;
    if (h >= 0 && h < 8) session = 'asian';
    else if (h >= 8 && h < 13) session = 'london';
    else if (h >= 13 && h < 21) session = 'newyork';
    else session = 'offhours';

    sessions[session].profit += p;
    sessions[session].trades += 1;
    if (p > 0) sessions[session].wins += 1;
    else if (p < 0) sessions[session].losses += 1;
  }

  return Object.values(sessions).filter((s) => s.trades > 0);
}

/**
 * Trade profit distribution — buckets for histogram
 */
function getTradeDistribution(trades) {
  const profits = trades.map((t) => t.profit || 0).filter((p) => p !== 0);
  if (profits.length === 0) return [];

  const min = Math.min(...profits);
  const max = Math.max(...profits);
  const range = max - min;
  if (range === 0) return [{ min: min, max: max, count: profits.length, label: `$${min.toFixed(0)}` }];

  const bucketCount = Math.min(20, Math.max(8, Math.ceil(Math.sqrt(profits.length))));
  const bucketSize = range / bucketCount;

  const buckets = [];
  for (let i = 0; i < bucketCount; i++) {
    const lo = min + i * bucketSize;
    const hi = lo + bucketSize;
    buckets.push({
      min: lo,
      max: hi,
      mid: (lo + hi) / 2,
      count: 0,
      label: `$${lo.toFixed(0)}`,
    });
  }

  for (const p of profits) {
    let idx = Math.floor((p - min) / bucketSize);
    if (idx >= bucketCount) idx = bucketCount - 1;
    buckets[idx].count++;
  }

  return buckets;
}

/**
 * Drawdown chart — for each day, show current drawdown from peak
 */
function getDrawdownCurve(equityCurve, startingBalance) {
  let peak = startingBalance;
  return equityCurve.map((point) => {
    const te = point.tradingEquity || point.balance;
    if (te > peak) peak = te;
    const drawdown = peak - te;
    return { date: point.date, drawdown: -drawdown, peak };
  });
}

export function formatDuration(minutes) {
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
}

export function getTradesForDate(trades, dateKey) {
  return trades.filter((t) => {
    const date = safeParseDate(t.closeTime) || safeParseDate(t.openTime);
    if (!date) return false;
    return format(date, 'yyyy-MM-dd') === dateKey;
  });
}

export function getSummaryStats(trades, startingBalance = 0, balanceOps = []) {
  const totalProfit = trades.reduce((s, t) => s + (t.profit || 0), 0);
  const totalCommission = trades.reduce((s, t) => s + (t.commission || 0), 0);
  const totalSwap = trades.reduce((s, t) => s + (t.swap || 0), 0);
  const netProfit = totalProfit + totalCommission + totalSwap;
  const wins = trades.filter((t) => (t.profit || 0) > 0);
  const losses = trades.filter((t) => (t.profit || 0) < 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.profit, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.profit, 0) / losses.length) : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
  const bestTrade = trades.length > 0 ? Math.max(...trades.map((t) => t.profit || 0)) : 0;
  const worstTrade = trades.length > 0 ? Math.min(...trades.map((t) => t.profit || 0)) : 0;

  // Expectancy = (Win% * AvgWin) - (Loss% * AvgLoss)
  const winPct = trades.length > 0 ? wins.length / trades.length : 0;
  const lossPct = trades.length > 0 ? losses.length / trades.length : 0;
  const expectancy = (winPct * avgWin) - (lossPct * avgLoss);

  const daily = getDailyPnL(trades);
  const bestDay = daily.length > 0 ? daily.reduce((best, d) => d.profit > best.profit ? d : best, daily[0]) : null;
  const worstDay = daily.length > 0 ? daily.reduce((worst, d) => d.profit < worst.profit ? d : worst, daily[0]) : null;

  // Build daily deposits/withdrawals map
  // Skip the first balance op per account (that's the starting deposit, already in startingBalance)
  // Skip inter-account transfers when viewing combined accounts (they cancel out)
  const dailyBalanceOps = {};
  const balanceEvents = [];
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  const seenFirstPerAccount = {};
  const accountSet = new Set(balanceOps.map((op) => op.account).filter(Boolean));
  const isMultiAccount = accountSet.size > 1;

  for (const op of balanceOps) {
    if (!op.time) continue;

    // Skip first balance op per account (it's the initial deposit = startingBalance)
    const acct = op.account || '_default';
    if (!seenFirstPerAccount[acct]) {
      seenFirstPerAccount[acct] = true;
      continue;
    }

    // Skip inter-account transfers when viewing all accounts (they net to zero)
    if (isMultiAccount) {
      const comment = (op.comment || '').toLowerCase();
      if (comment.includes('transfer in from') || comment.includes('transfer out to')) {
        continue;
      }
    }

    const key = op.time.slice(0, 10);
    if (!dailyBalanceOps[key]) dailyBalanceOps[key] = 0;
    dailyBalanceOps[key] += op.amount || 0;
    if (op.amount > 0) totalDeposits += op.amount;
    else totalWithdrawals += Math.abs(op.amount);
    balanceEvents.push({ date: key, amount: op.amount, type: op.amount >= 0 ? 'deposit' : 'withdrawal', comment: op.comment || '' });
  }

  // Build TWO equity curves:
  // 1. actualBalance = real account balance (starting + trades + deposits/withdrawals)
  // 2. tradingEquity = starting + trading P/L only (for drawdown calculation)
  let actualBalance = startingBalance;
  let tradingEquity = startingBalance;
  const equityCurve = daily.map((d) => {
    const balOp = dailyBalanceOps[d.date] || 0;
    actualBalance += d.profit + balOp;
    tradingEquity += d.profit; // pure trading performance, no deposits/withdrawals
    return {
      date: d.date,
      balance: actualBalance,        // what your account actually shows
      tradingEquity,                  // pure trading performance
      profit: d.profit,
      balanceOp: balOp,               // net deposit/withdrawal that day
    };
  });

  // Max drawdown based on TRADING EQUITY only (withdrawals are not drawdowns!)
  let tradingPeak = startingBalance;
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    if (point.tradingEquity > tradingPeak) tradingPeak = point.tradingEquity;
    const dd = tradingPeak - point.tradingEquity;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Growth % based on trading P/L only
  const currentBalance = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].balance : startingBalance;
  const tradingPnLOnly = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].tradingEquity - startingBalance : 0;
  const growthPct = startingBalance > 0 ? (tradingPnLOnly / startingBalance) * 100 : 0;

  // Symbol breakdown
  const symbolStats = {};
  for (const trade of trades) {
    const sym = trade.symbol || 'Unknown';
    if (!symbolStats[sym]) symbolStats[sym] = { symbol: sym, profit: 0, trades: 0, wins: 0 };
    symbolStats[sym].profit += trade.profit || 0;
    symbolStats[sym].trades += 1;
    if ((trade.profit || 0) > 0) symbolStats[sym].wins += 1;
  }

  const streaks = getStreaks(trades);
  const hourlyStats = getHourlyStats(trades);
  const durationStats = getDurationStats(trades);
  const dayOfWeekStats = getDayOfWeekStats(trades);
  const sessionStats = getSessionStats(trades);
  const tradeDistribution = getTradeDistribution(trades);
  const drawdownCurve = getDrawdownCurve(equityCurve, startingBalance);

  return {
    totalTrades: trades.length,
    totalProfit, totalCommission, totalSwap, netProfit,
    wins: wins.length, losses: losses.length, winRate,
    avgWin, avgLoss, profitFactor, expectancy,
    bestTrade, worstTrade, bestDay, worstDay, maxDrawdown,
    startingBalance, currentBalance, growthPct, totalDeposits, totalWithdrawals, balanceEvents,
    equityCurve, drawdownCurve, dailyPnL: daily,
    symbolStats: Object.values(symbolStats).sort((a, b) => b.profit - a.profit),
    streaks, hourlyStats, durationStats,
    dayOfWeekStats, sessionStats, tradeDistribution,
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
