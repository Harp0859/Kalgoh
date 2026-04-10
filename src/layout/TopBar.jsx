import { Users, Menu, Loader2 } from 'lucide-react';
import DatePicker from '../shared/DatePicker';
import Dropdown from '../shared/Dropdown';

export default function TopBar({ title, subtitle, hasTrades, tab, accounts, selectedAccount, setSelectedAccount, dateFrom, dateTo, setDateFrom, setDateTo, hasDateFilter, filteredCount, onMenuOpen, autoSyncing }) {
  const showFilters = hasTrades && tab !== 'upload' && tab !== 'settings';

  return (
    <div className="mb-5 lg:mb-8">
      {/* Mobile: hamburger + brand */}
      <div className="lg:hidden flex items-center justify-between mb-4">
        <button onClick={onMenuOpen} className="w-9 h-9 bg-card rounded-xl flex items-center justify-center shrink-0">
          <Menu className="w-4.5 h-4.5 text-text-light" />
        </button>
        <span className="text-base font-bold text-text-primary tracking-tight">Kalgoh</span>
        <div className="w-9" />
      </div>

      {/* Filters row */}
      {showFilters && (
        <div className="flex items-center gap-2 mb-4 lg:mb-6 lg:justify-end">
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

      {/* Page title */}
      <h1 className="text-3xl lg:text-5xl font-bold text-text-primary tracking-tight">{title}</h1>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-xs lg:text-sm text-text-muted">
          {subtitle}
          {showFilters && filteredCount !== undefined && ` \u00b7 ${filteredCount} trades`}
          {hasDateFilter && ' \u00b7 filtered'}
        </p>
        {autoSyncing && (
          <span className="inline-flex items-center gap-1.5 text-[10px] lg:text-[11px] font-medium text-accent-blue bg-accent-blue/10 rounded-full px-2.5 py-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Syncing brokers
          </span>
        )}
      </div>
    </div>
  );
}
