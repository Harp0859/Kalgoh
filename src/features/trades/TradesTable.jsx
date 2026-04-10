import { useState, useMemo } from 'react';
import { ArrowUpDown, Search, ChevronLeft, ChevronRight, Filter, ChevronDown, ArrowRight } from 'lucide-react';
import { formatDateTimeUTC } from '../../utils/dateFormat';
import Dropdown from '../../shared/Dropdown';

const PAGE_SIZE = 50;

const formatDate = formatDateTimeUTC;

function formatNum(val, decimals = 2) {
  if (val === undefined || val === null) return '-';
  return Number(val).toFixed(decimals);
}

// Mobile sort options. Each encodes both field and direction.
const MOBILE_SORT_OPTIONS = [
  { value: 'closeTime:desc', label: 'Newest first' },
  { value: 'closeTime:asc', label: 'Oldest first' },
  { value: 'profit:desc', label: 'Biggest profit' },
  { value: 'profit:asc', label: 'Biggest loss' },
  { value: 'volume:desc', label: 'Largest volume' },
];

function TradeCard({ trade, showAccount, expanded, onToggle }) {
  const isBuy = (trade.type || '').toLowerCase() === 'buy';
  const profit = trade.profit || 0;
  const profitPositive = profit >= 0;

  return (
    <div
      onClick={onToggle}
      className="bg-card rounded-2xl p-4 shadow-xl shadow-black/5 active:bg-card-light transition-colors duration-100 cursor-pointer select-none"
    >
      {/* Top row: symbol + type badge on left, profit on right */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-text-light text-base truncate">
            {trade.symbol || '-'}
          </span>
          <span
            className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide shrink-0
              ${isBuy ? 'bg-profit-bg text-profit' : 'bg-loss-bg text-loss'}`}
          >
            {trade.type || '-'}
          </span>
        </div>
        <span
          className={`font-semibold text-base shrink-0 ${profitPositive ? 'text-profit' : 'text-loss'}`}
        >
          {profitPositive ? '+' : ''}
          {formatNum(profit)}
        </span>
      </div>

      {/* Second row: close time */}
      <div className="mt-1 text-[11px] text-text-card-muted">
        {formatDate(trade.closeTime)}
      </div>

      {/* Third row: volume and open -> close, subtle */}
      <div className="mt-2 flex items-center gap-2 text-[11px] text-text-card-muted">
        <span className="font-medium">{formatNum(trade.volume, 2)} lot</span>
        <span className="opacity-40">·</span>
        <span className="flex items-center gap-1 min-w-0 truncate">
          <span>{formatNum(trade.openPrice, 5)}</span>
          <ArrowRight className="w-3 h-3 opacity-50 shrink-0" />
          <span>{formatNum(trade.closePrice, 5)}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 ml-auto text-text-muted transition-transform duration-200 shrink-0 ${expanded ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border-card grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
          {showAccount && (
            <div className="col-span-2">
              <div className="text-text-muted uppercase tracking-wider text-[9px] font-medium mb-0.5">Account</div>
              <div className="text-text-light font-medium">{trade.account || '-'}</div>
            </div>
          )}
          <div>
            <div className="text-text-muted uppercase tracking-wider text-[9px] font-medium mb-0.5">Open Time</div>
            <div className="text-text-card-muted">{formatDate(trade.openTime)}</div>
          </div>
          <div>
            <div className="text-text-muted uppercase tracking-wider text-[9px] font-medium mb-0.5">Close Time</div>
            <div className="text-text-card-muted">{formatDate(trade.closeTime)}</div>
          </div>
          {(trade.sl !== undefined && trade.sl !== null) && (
            <div>
              <div className="text-text-muted uppercase tracking-wider text-[9px] font-medium mb-0.5">Stop Loss</div>
              <div className="text-text-card-muted">{formatNum(trade.sl, 5)}</div>
            </div>
          )}
          {(trade.tp !== undefined && trade.tp !== null) && (
            <div>
              <div className="text-text-muted uppercase tracking-wider text-[9px] font-medium mb-0.5">Take Profit</div>
              <div className="text-text-card-muted">{formatNum(trade.tp, 5)}</div>
            </div>
          )}
          <div>
            <div className="text-text-muted uppercase tracking-wider text-[9px] font-medium mb-0.5">Commission</div>
            <div className="text-text-card-muted">{formatNum(trade.commission)}</div>
          </div>
          <div>
            <div className="text-text-muted uppercase tracking-wider text-[9px] font-medium mb-0.5">Swap</div>
            <div className="text-text-card-muted">{formatNum(trade.swap)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TradesTable({ trades, showAccount = false }) {
  const [sortField, setSortField] = useState('closeTime');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [tradeFilter, setTradeFilter] = useState('all'); // 'all' | 'wins' | 'losses'
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    let result = trades;

    // Win/loss filter
    if (tradeFilter === 'wins') result = result.filter((t) => (t.profit || 0) > 0);
    else if (tradeFilter === 'losses') result = result.filter((t) => (t.profit || 0) < 0);

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        (t.symbol || '').toLowerCase().includes(q) ||
        (t.type || '').toLowerCase().includes(q) ||
        (t.ticket || '').toString().includes(q)
      );
    }

    return result;
  }, [trades, search, tradeFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av = a[sortField];
      let bv = b[sortField];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const startIdx = page * PAGE_SIZE + 1;
  const endIdx = Math.min((page + 1) * PAGE_SIZE, sorted.length);

  function toggleSort(field) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  }

  const mobileSortValue = `${sortField}:${sortDir}`;
  function handleMobileSortChange(v) {
    const [field, dir] = v.split(':');
    setSortField(field);
    setSortDir(dir);
    setPage(0);
  }

  const columns = [
    ...(showAccount ? [{ key: 'account', label: 'Account', align: 'left', render: (t) => (
      <span className="text-xs font-medium text-text-card-muted">{t.account || '-'}</span>
    )}] : []),
    { key: 'closeTime', label: 'Close Time', align: 'left', render: (t) => (
      <span className="text-text-card-muted">{formatDate(t.closeTime)}</span>
    )},
    { key: 'symbol', label: 'Symbol', align: 'left', render: (t) => (
      <span className="font-medium text-text-light">{t.symbol || '-'}</span>
    )},
    { key: 'type', label: 'Type', align: 'left', render: (t) => (
      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide
        ${(t.type || '').toLowerCase() === 'buy' ? 'bg-profit-bg text-profit' : 'bg-loss-bg text-loss'}`}>
        {t.type || '-'}
      </span>
    )},
    { key: 'volume', label: 'Volume', align: 'right', render: (t) => (
      <span className="text-text-card-muted">{formatNum(t.volume, 2)}</span>
    )},
    { key: 'openPrice', label: 'Open', align: 'right', render: (t) => (
      <span className="text-text-card-muted">{formatNum(t.openPrice, 5)}</span>
    )},
    { key: 'closePrice', label: 'Close', align: 'right', render: (t) => (
      <span className="text-text-card-muted">{formatNum(t.closePrice, 5)}</span>
    )},
    { key: 'commission', label: 'Comm.', align: 'right', render: (t) => (
      <span className="text-text-card-muted">{formatNum(t.commission)}</span>
    )},
    { key: 'swap', label: 'Swap', align: 'right', render: (t) => (
      <span className="text-text-card-muted">{formatNum(t.swap)}</span>
    )},
    { key: 'profit', label: 'Profit', align: 'right', render: (t) => (
      <span className={`font-semibold ${(t.profit || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
        {(t.profit || 0) >= 0 ? '+' : ''}{formatNum(t.profit)}
      </span>
    )},
  ];

  const filterButtons = [
    { id: 'all', label: 'All' },
    { id: 'wins', label: 'Wins' },
    { id: 'losses', label: 'Losses' },
  ];

  return (
    <div>
      {/* Toolbar - desktop (>=lg): unchanged layout */}
      <div className="hidden lg:flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search symbol, type..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-72 pl-10 pr-4 py-2.5 bg-bg-alt rounded-xl text-sm text-text-primary placeholder-text-muted border border-border-subtle focus:outline-none focus:ring-2 focus:ring-card/20"
            />
          </div>
          {/* Filter chips */}
          <div className="flex items-center gap-1 bg-bg-alt rounded-xl p-1 border border-border-subtle">
            <Filter className="w-3.5 h-3.5 text-text-muted ml-2 mr-1" />
            {filterButtons.map((fb) => (
              <button
                key={fb.id}
                onClick={() => { setTradeFilter(fb.id); setPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                  ${tradeFilter === fb.id
                    ? 'bg-card text-text-light shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                  }`}
              >
                {fb.label}
              </button>
            ))}
          </div>
        </div>
        <span className="bg-card text-text-light rounded-full px-3 py-1 text-xs font-medium">
          {filtered.length} trades
        </span>
      </div>

      {/* Toolbar - mobile (<lg): stacked */}
      <div className="lg:hidden mb-4 flex flex-col gap-3">
        {/* Search - full width */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search symbol, type..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-10 pr-4 py-2.5 bg-bg-alt rounded-xl text-sm text-text-primary placeholder-text-muted border border-border-subtle focus:outline-none focus:ring-2 focus:ring-card/20"
          />
        </div>
        {/* Filter chips + sort dropdown */}
        <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 scrollbar-none">
          <div className="flex items-center gap-1 bg-bg-alt rounded-xl p-1 border border-border-subtle shrink-0">
            <Filter className="w-3.5 h-3.5 text-text-muted ml-2 mr-1" />
            {filterButtons.map((fb) => (
              <button
                key={fb.id}
                onClick={() => { setTradeFilter(fb.id); setPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap
                  ${tradeFilter === fb.id
                    ? 'bg-card text-text-light shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                  }`}
              >
                {fb.label}
              </button>
            ))}
          </div>
          <div className="shrink-0">
            <Dropdown
              value={mobileSortValue}
              onChange={handleMobileSortChange}
              options={MOBILE_SORT_OPTIONS}
              icon={ArrowUpDown}
            />
          </div>
        </div>
        {/* Trade count pill */}
        <div>
          <span className="bg-card text-text-light rounded-full px-3 py-1 text-xs font-medium inline-block">
            {filtered.length} trades
          </span>
        </div>
      </div>

      {/* Table - desktop only */}
      <div className="hidden lg:block overflow-x-auto rounded-3xl bg-card shadow-xl shadow-black/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-border-card">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-5 text-[10px] font-medium text-text-card-muted uppercase tracking-widest cursor-pointer hover:text-text-light select-none
                    ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                  onClick={() => toggleSort(col.key)}
                >
                  <div className={`flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : ''}`}>
                    {col.label}
                    <ArrowUpDown className={`w-3 h-3 ${sortField === col.key ? 'text-text-light' : 'opacity-20'}`} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((trade, i) => (
              <tr
                key={trade.id || i}
                className={`border-b border-border-card last:border-0 hover:bg-card-light transition-colors duration-100
                  ${i % 2 === 1 ? 'bg-card-surface' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-5 py-3 whitespace-nowrap ${col.align === 'right' ? 'text-right' : ''}`}>
                    {col.render(trade)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card list - mobile only */}
      <div className="lg:hidden flex flex-col gap-3">
        {paged.map((trade, i) => {
          const id = trade.id || `idx-${page}-${i}`;
          return (
            <TradeCard
              key={id}
              trade={trade}
              showAccount={showAccount}
              expanded={expandedId === id}
              onToggle={() => setExpandedId((cur) => (cur === id ? null : id))}
            />
          );
        })}
        {paged.length === 0 && (
          <div className="bg-card rounded-2xl p-6 text-center text-sm text-text-card-muted">
            No trades found
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <>
          {/* Desktop pagination */}
          <div className="hidden lg:flex items-center justify-between mt-5">
            <span className="text-xs text-text-muted font-medium">
              Showing {startIdx}-{endIdx} of {sorted.length} trades
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-xl bg-bg-alt text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors duration-150"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {/* Page numbers */}
              {(() => {
                const pages = [];
                const maxVisible = 5;
                let start = Math.max(0, page - Math.floor(maxVisible / 2));
                let end = Math.min(totalPages, start + maxVisible);
                if (end - start < maxVisible) start = Math.max(0, end - maxVisible);

                if (start > 0) {
                  pages.push(
                    <button key={0} onClick={() => setPage(0)} className="w-8 h-8 rounded-lg text-xs font-medium text-text-muted hover:text-text-primary hover:bg-bg-alt">1</button>
                  );
                  if (start > 1) pages.push(<span key="start-ellipsis" className="text-text-muted text-xs px-1">...</span>);
                }

                for (let i = start; i < end; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all duration-150
                        ${page === i ? 'bg-card text-text-light shadow-sm' : 'text-text-muted hover:text-text-primary hover:bg-bg-alt'}`}
                    >
                      {i + 1}
                    </button>
                  );
                }

                if (end < totalPages) {
                  if (end < totalPages - 1) pages.push(<span key="end-ellipsis" className="text-text-muted text-xs px-1">...</span>);
                  pages.push(
                    <button key={totalPages - 1} onClick={() => setPage(totalPages - 1)} className="w-8 h-8 rounded-lg text-xs font-medium text-text-muted hover:text-text-primary hover:bg-bg-alt">{totalPages}</button>
                  );
                }

                return pages;
              })()}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-xl bg-bg-alt text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors duration-150"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile pagination */}
          <div className="lg:hidden mt-4 flex flex-col gap-3">
            <span className="text-[11px] text-text-muted font-medium text-center leading-relaxed">
              Showing {startIdx}-{endIdx} of {sorted.length} trades
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-bg-alt text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors duration-150 text-sm font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              {/* Compact page numbers */}
              <div className="flex items-center gap-1 shrink-0">
                {(() => {
                  const pages = [];
                  const maxVisible = 3;
                  let start = Math.max(0, page - Math.floor(maxVisible / 2));
                  let end = Math.min(totalPages, start + maxVisible);
                  if (end - start < maxVisible) start = Math.max(0, end - maxVisible);

                  for (let i = start; i < end; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={`w-7 h-7 rounded-lg text-[11px] font-medium transition-all duration-150
                          ${page === i ? 'bg-card text-text-light shadow-sm' : 'text-text-muted hover:text-text-primary hover:bg-bg-alt'}`}
                      >
                        {i + 1}
                      </button>
                    );
                  }
                  return pages;
                })()}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-bg-alt text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors duration-150 text-sm font-medium"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
