export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card-lighter border border-border-card rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <p className="text-text-card-muted mb-1.5 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
}

export function EquityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="bg-card-lighter border border-border-card rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <p className="text-text-card-muted mb-1.5 font-medium">{label}</p>
      <p className="text-text-light font-semibold">Balance: ${data?.balance?.toFixed(2)}</p>
      {data?.tradingEquity !== undefined && Math.abs(data.tradingEquity - data.balance) > 0.01 && (
        <p className="text-accent-blue font-semibold">Trading: ${data.tradingEquity.toFixed(2)}</p>
      )}
      <p className={`font-semibold ${(data?.profit || 0) >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
        Day P/L: {(data?.profit || 0) >= 0 ? '+' : ''}${(data?.profit || 0).toFixed(2)}
      </p>
      {data?.balanceOp !== 0 && data?.balanceOp !== undefined && (
        <p className={`font-semibold mt-1 ${data.balanceOp > 0 ? 'text-accent-blue' : 'text-yellow-400'}`}>
          {data.balanceOp > 0 ? 'Deposit' : 'Withdrawal'}: {data.balanceOp > 0 ? '+' : ''}${data.balanceOp.toFixed(2)}
        </p>
      )}
    </div>
  );
}
