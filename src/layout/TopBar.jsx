import { Users, Menu, Loader2 } from 'lucide-react';

import DatePicker from '../shared/DatePicker';
import Dropdown from '../shared/Dropdown';

export default function TopBar({ title, subtitle, hasTrades, tab, accounts, selectedAccount, setSelectedAccount, dateFrom, dateTo, setDateFrom, setDateTo, hasDateFilter, filteredCount, onMenuOpen, autoSyncing, mobileMenuOpen }) {
  const showFilters = hasTrades && tab !== 'upload' && tab !== 'settings';

  return (
    <header className="mb-5 lg:mb-8">
      {/* Mobile: fixed hamburger + brand, frosted over scrolled content.
       *  Uses `fixed` rather than `sticky` because sticky would be
       *  bounded by the <header> element's height and scroll away once
       *  the title/filters exit the viewport. Padding-top includes the
       *  safe-area inset so the frosted background extends up into the
       *  iOS notch area — otherwise scrolling content shows through
       *  above the bar. Main has a matching top padding on mobile so
       *  content isn't hidden under this bar. */}
      <div
        className="lg:hidden fixed top-0 inset-x-0 z-30 px-4 pb-3
          pt-[calc(env(safe-area-inset-top)+0.75rem)]
          bg-bg/85 backdrop-blur-xl backdrop-saturate-150
          border-b border-white/[0.04]
          flex items-center justify-between"
      >
        <button
          type="button"
          onClick={onMenuOpen}
          aria-label="Open menu"
          aria-expanded={!!mobileMenuOpen}
          className="w-11 h-11 bg-card rounded-xl inline-flex items-center justify-center shrink-0
            focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg
            transition-colors duration-150 hover:bg-card-light"
        >
          <Menu className="w-5 h-5 text-text-light" aria-hidden="true" />
        </button>
        <span className="text-2xl font-bold text-text-primary tracking-tight">Kalgoh</span>
        <div className="w-11" aria-hidden="true" />
      </div>

      {/* Title row — page title on the left, filters on the right */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl lg:text-5xl font-bold text-text-primary tracking-tight leading-[1.15] min-w-0">
          {title}
        </h1>

        {showFilters && (
          <div className="flex items-center gap-2 shrink-0">
            <DatePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChangeFrom={setDateFrom}
              onChangeTo={setDateTo}
              onClear={() => { setDateFrom(''); setDateTo(''); }}
            />
            {accounts.length > 1 && (
              <Dropdown
                value={selectedAccount}
                onChange={setSelectedAccount}
                icon={Users}
                options={[
                  { value: 'all', label: 'All Accounts' },
                  ...accounts.map((a) => ({ value: a, label: a })),
                ]}
              />
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-1">
        <p className="text-xs lg:text-sm text-text-muted">
          {subtitle}
          {showFilters && filteredCount !== undefined && ` \u00b7 ${filteredCount} trades`}
          {hasDateFilter && ' \u00b7 filtered'}
        </p>
        {autoSyncing && (
          <span
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-1.5 text-[10px] lg:text-[11px] font-medium text-accent-blue bg-accent-blue/10 rounded-full px-2.5 py-1"
          >
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
            Syncing brokers
          </span>
        )}
      </div>
    </header>
  );
}
