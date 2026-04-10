import { useState, useRef, useEffect, useMemo, useCallback, useId } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

// A searchable dropdown/combobox with keyboard navigation and a mobile
// bottom-sheet variant. Built to mirror the look & feel of Dropdown.jsx.
//
// Props:
//   value          — currently selected value (string)
//   onChange(val)  — called with the newly selected value
//   options        — array of { value, label } OR array of strings
//   placeholder    — placeholder text when nothing is selected
//   icon           — optional Lucide icon component for the trigger
//   disabled       — boolean
//   emptyMessage   — string shown when the search yields no matches
//   ariaLabel      — optional accessible label for the trigger
export default function SearchableCombobox({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  icon: Icon,
  disabled = false,
  emptyMessage = 'No matches',
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const ref = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listboxId = useId();

  // Normalise options into { value, label } pairs.
  const normalized = useMemo(
    () =>
      (options || []).map((o) =>
        typeof o === 'string' ? { value: o, label: o } : o
      ),
    [options]
  );

  const selected = normalized.find((o) => o.value === value);

  // Filtered options based on the current query.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((o) => o.label.toLowerCase().includes(q));
  }, [normalized, query]);

  // Reset the highlighted index whenever the filter changes.
  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  // Close on outside click (desktop only — the mobile backdrop handles this).
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Escape key closes the popover.
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  // Focus the search input when the popover opens.
  useEffect(() => {
    if (open && inputRef.current) {
      // Defer so the popover is mounted before we focus.
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  // Keep the highlighted item scrolled into view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${highlight}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlight, open]);

  const handleSelect = useCallback(
    (val) => {
      onChange?.(val);
      setOpen(false);
      setQuery('');
    },
    [onChange]
  );

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) handleSelect(opt.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel || (selected?.label ? `${placeholder}: ${selected.label}` : placeholder)}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`w-full min-h-[44px] flex items-center gap-2.5 px-4 py-3 rounded-xl bg-card-lighter text-left transition-colors duration-150
          ${disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-card-light cursor-pointer'}
          focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card`}
      >
        {Icon && <Icon className="w-4 h-4 text-text-card-muted shrink-0" aria-hidden="true" />}
        <span
          className={`flex-1 text-sm truncate ${
            selected ? 'text-text-light' : 'text-text-card-muted/60'
          }`}
        >
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-text-card-muted shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Popover — bottom sheet on mobile, anchored dropdown on desktop */}
      {open && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-[65] bg-black/50 animate-backdropFadeIn"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed left-4 right-4 bottom-6 lg:bottom-auto lg:absolute lg:left-0 lg:right-0 lg:top-full lg:mt-2 bg-card rounded-2xl border border-border-card shadow-xl shadow-black/30 z-[70] overflow-hidden flex flex-col animate-popoverScaleIn pb-[env(safe-area-inset-bottom)] lg:pb-0"
          >
            {/* Search input */}
            <div className="relative border-b border-border-card">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-card-muted pointer-events-none" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                aria-label="Search options"
                aria-autocomplete="list"
                aria-controls={listboxId}
                aria-activedescendant={
                  filtered[highlight] ? `${listboxId}-opt-${highlight}` : undefined
                }
                className="w-full bg-transparent pl-10 pr-11 py-3 text-sm text-text-light placeholder:text-text-card-muted/60 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-text-card-muted hover:text-text-light hover:bg-card-lighter focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Options list */}
            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              className="overflow-y-auto py-1"
              style={{ maxHeight: 280 }}
            >
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-text-card-muted">
                  {emptyMessage}
                </div>
              ) : (
                filtered.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = idx === highlight;
                  return (
                    <button
                      key={opt.value}
                      id={`${listboxId}-opt-${idx}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      data-idx={idx}
                      onClick={() => handleSelect(opt.value)}
                      onMouseEnter={() => setHighlight(idx)}
                      className={`w-full min-h-[44px] flex items-center justify-between gap-2 px-4 py-3 text-sm text-left transition-colors duration-75
                        ${isHighlighted
                          ? 'bg-card-lighter text-text-light'
                          : isSelected
                            ? 'text-text-light'
                            : 'text-text-card-muted hover:text-text-light'}`}
                    >
                      <span className="truncate">
                        {highlightMatch(opt.label, query)}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-profit shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Wraps substring matches in a <mark> with subtle highlight styling.
function highlightMatch(label, query) {
  const q = query.trim();
  if (!q) return label;
  const lower = label.toLowerCase();
  const needle = q.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx === -1) return label;
  const before = label.slice(0, idx);
  const match = label.slice(idx, idx + needle.length);
  const after = label.slice(idx + needle.length);
  return (
    <>
      {before}
      <mark className="bg-profit/20 text-profit rounded-sm px-0.5">
        {match}
      </mark>
      {after}
    </>
  );
}
