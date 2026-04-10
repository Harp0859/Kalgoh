import { useState, useMemo } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { ArrowUpDown, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const PAGE_SIZE = 50;

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, 'MMM dd, yyyy HH:mm') : '-';
  } catch {
    return '-';
  }
}

function formatNum(val, decimals = 2) {
  if (val === undefined || val === null) return '-';
  return Number(val).toFixed(decimals);
}

export default function TradesTable({ trades, showAccount = false }) {
  const [sortField, setSortField] = useState('closeTime');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [tradeFilter, setTradeFilter] = useState('all'); // 'all' | 'wins' | 'losses'

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
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
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

      {/* Table */}
      <div className="overflow-x-auto rounded-3xl bg-card shadow-xl shadow-black/5">
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
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
      )}
    </div>
  );
}
