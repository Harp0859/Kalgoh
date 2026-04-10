export const CARD = 'bg-card rounded-2xl lg:rounded-3xl p-4 lg:p-6 hover:ring-1 hover:ring-white/5 transition-all duration-200';

export function StatCard({ icon: Icon, label, value, sub, accent }) {
  const border = accent === 'profit' ? 'border-l-profit' : accent === 'loss' ? 'border-l-loss' : 'border-l-accent-blue';
  return (
    <div className={`bg-card rounded-2xl p-4 lg:p-5 flex flex-col justify-between min-h-[100px] lg:min-h-[120px] border-l-2 ${border} hover:bg-card-light hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/10 transition-all duration-200 cursor-default`}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] lg:text-[10px] text-text-card-muted font-medium tracking-widest uppercase">{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-text-card-muted" />}
      </div>
      <div>
        <p className="text-lg lg:text-xl font-bold text-text-light tracking-tight leading-tight">{value}</p>
        {sub && <p className="text-[10px] lg:text-[11px] text-text-card-muted mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export function HeroStat({ value, label, sub, isPositive }) {
  return (
    <div className={`bg-card rounded-2xl p-4 lg:p-6 col-span-2 border-l-2 ${isPositive ? 'border-l-profit' : 'border-l-loss'} hover:bg-card-light hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/10 transition-all duration-200 cursor-default`}>
      <span className="text-[9px] lg:text-[10px] text-text-card-muted font-medium tracking-widest uppercase">{label}</span>
      <p className={`text-2xl lg:text-4xl font-bold tracking-tight leading-tight mt-1 lg:mt-2 ${isPositive ? 'text-profit' : 'text-loss'}`}>{value}</p>
      {sub && <p className="text-[10px] lg:text-xs text-text-card-muted mt-1">{sub}</p>}
    </div>
  );
}
