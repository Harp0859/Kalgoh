/**
 * Shared card primitives. Everything in the dashboard that needs to look
 * like a "premium" card should either use the `CARD` class string or the
 * StatCard / HeroStat components below. The visual language is owned by
 * the `.card-premium` utility in index.css — cards here just compose it.
 */

// Base class string used by any plain container that should look like a
// premium card (charts, lists, callouts). Pair with a rounded/padding of
// your choosing and optionally one of the tint variants below.
export const CARD =
  'card-premium bg-card rounded-2xl lg:rounded-3xl p-4 lg:p-6';

export const CARD_PROFIT = `${CARD} card-premium-profit`;
export const CARD_LOSS = `${CARD} card-premium-loss`;
export const CARD_BLUE = `${CARD} card-premium-blue`;

function accentTintClass(accent) {
  if (accent === 'profit') return 'card-premium-profit';
  if (accent === 'loss') return 'card-premium-loss';
  return 'card-premium-blue';
}

function accentDotClass(accent) {
  if (accent === 'profit') return 'bg-profit shadow-[0_0_10px_rgba(74,222,128,0.55)]';
  if (accent === 'loss') return 'bg-loss shadow-[0_0_10px_rgba(248,113,113,0.55)]';
  return 'bg-accent-blue shadow-[0_0_10px_rgba(96,165,250,0.5)]';
}

export function StatCard({ icon: Icon, label, value, sub, accent, onClick, ariaLabel }) {
  const base = [
    'card-premium',
    accentTintClass(accent),
    'relative bg-card rounded-2xl p-4 lg:p-5',
    'flex flex-col justify-between min-h-[108px] lg:min-h-[128px]',
    'text-left w-full',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
  ].join(' ');

  const inner = (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${accentDotClass(accent)}`}
          />
          <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-text-card-muted truncate">
            {label}
          </span>
        </div>
        {Icon && (
          <Icon
            className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-text-card-muted/70 shrink-0"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="mt-3">
        <p className="text-xl lg:text-2xl font-bold text-text-light tracking-[-0.02em] leading-[1.1] tabular-nums">
          {value}
        </p>
        {sub && (
          <p className="text-xs text-text-card-muted mt-1 tabular-nums">{sub}</p>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel || label} className={base}>
        {inner}
      </button>
    );
  }
  return (
    <div className={base} aria-label={ariaLabel || label} role="group">
      {inner}
    </div>
  );
}

export function HeroStat({ value, label, sub, isPositive }) {
  const tint = isPositive ? 'card-premium-profit' : 'card-premium-loss';
  const valueColor = isPositive ? 'text-profit' : 'text-loss';
  return (
    <div
      className={`card-premium ${tint} relative col-span-2 bg-card rounded-2xl p-4 lg:p-6 min-h-[108px] lg:min-h-[128px] focus:outline-none`}
      aria-label={label}
      role="group"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`w-1.5 h-1.5 rounded-full ${
            isPositive
              ? 'bg-profit shadow-[0_0_10px_rgba(74,222,128,0.55)]'
              : 'bg-loss shadow-[0_0_10px_rgba(248,113,113,0.55)]'
          }`}
        />
        <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-text-card-muted">
          {label}
        </span>
      </div>
      <p
        className={`text-3xl lg:text-[40px] font-bold tracking-[-0.035em] leading-[1.02] mt-2 lg:mt-3 tabular-nums ${valueColor}`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-text-card-muted mt-1.5 tabular-nums">{sub}</p>}
    </div>
  );
}
