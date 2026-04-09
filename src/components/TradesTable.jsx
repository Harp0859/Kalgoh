import { useState, useMemo } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { ArrowUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';

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

  const filtered = useMemo(() => {
    if (!search.trim()) return trades;
    const q = search.toLowerCase();
    return trades.filter((t) =>
      (t.symbol || '').toLowerCase().includes(q) ||
      (t.type || '').toLowerCase().includes(q) ||
      (t.ticket || '').toString().includes(q)
    );
  }, [trades, search]);

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

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  const columns = [
    ...(showAccount ? [{ key: 'account', label: 'Account', render: (t) => (
      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">{t.account || '-'}</span>
    )}] : []),
    { key: 'closeTime', label: 'Close Time', render: (t) => formatDate(t.closeTime) },
    { key: 'symbol', label: 'Symbol', render: (t) => t.symbol || '-' },
    { key: 'type', label: 'Type', render: (t) => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
        (t.type || '').toLowerCase() === 'buy' ? 'bg-profit/15 text-profit' : 'bg-loss/15 text-loss'
      }`}>
        {t.type || '-'}
      </span>
    )},
    { key: 'volume', label: 'Volume', render: (t) => formatNum(t.volume, 2) },
    { key: 'openPrice', label: 'Open', render: (t) => formatNum(t.openPrice, 5) },
    { key: 'closePrice', label: 'Close', render: (t) => formatNum(t.closePrice, 5) },
    { key: 'commission', label: 'Comm.', render: (t) => formatNum(t.commission) },
    { key: 'swap', label: 'Swap', render: (t) => formatNum(t.swap) },
    { key: 'profit', label: 'Profit', render: (t) => (
      <span className={`font-medium ${(t.profit || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
        {(t.profit || 0) >= 0 ? '+' : ''}{formatNum(t.profit)}
      </span>
    )},
  ];

  return (
    <div>
      {/* Search & Count */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search symbol, type..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-3 py-2 bg-surface-light border border-border rounded-lg text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary"
          />
        </div>
        <span className="text-sm text-text-muted">{filtered.length} trades</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-light">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:text-text select-none"
                  onClick={() => toggleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown className={`w-3 h-3 ${sortField === col.key ? 'text-primary' : 'opacity-30'}`} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.map((trade, i) => (
              <tr key={trade.id || i} className="hover:bg-surface-light/50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2.5 whitespace-nowrap">
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
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-text-muted">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg bg-surface-light border border-border text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg bg-surface-light border border-border text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
