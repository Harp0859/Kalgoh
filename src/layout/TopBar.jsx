import { createPortal } from 'react-dom';
import { Users, Menu, Loader2 } from 'lucide-react';

import DatePicker from '../shared/DatePicker';
import Dropdown from '../shared/Dropdown';

export default function TopBar({ title, subtitle, hasTrades, tab, accounts, selectedAccount, setSelectedAccount, dateFrom, dateTo, setDateFrom, setDateTo, hasDateFilter, filteredCount, onMenuOpen, autoSyncing, mobileMenuOpen }) {
  const showFilters = hasTrades && tab !== 'upload' && tab !== 'settings';

  // Mobile fixed bar is portalled directly into <body> so no ancestor
  // (transforms, filters, contains, animations on <main>/<header>/the
  // tab-enter div) can create a containing block that offsets it or
  // kills `position: fixed` during iOS momentum scroll. This is the
  // bulletproof fix for the "content ghosts above the header" bug.
  const mobileBar = typeof document !== 'undefined' ? createPortal(
    <div
      className="lg:hidden flex items-center justify-between border-b border-border-subtle"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
        paddingBottom: 12,
        paddingLeft: 16,
        paddingRight: 16,
        backgroundColor: 'var(--color-bg)',
      }}
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
    </div>,
    document.body,
  ) : null;

  return (
    <header className="mb-5 lg:mb-8">
      {mobileBar}

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
