import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function Dropdown({ value, onChange, options, icon: Icon, placeholder = 'Select...', ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const listboxId = useId();

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keep highlight aligned with the current selection when opening.
  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setHighlight(idx >= 0 ? idx : 0);
    }
  }, [open, options, value]);

  // Escape key closes the popover.
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  function handleKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = options[highlight];
      if (opt) {
        onChange(opt.value);
        setOpen(false);
      }
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel || (selected?.label ? `${placeholder}: ${selected.label}` : placeholder)}
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        className="min-h-[44px] flex items-center gap-2 px-3.5 py-3 rounded-xl bg-bg-alt border border-border-subtle hover:border-border transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        {Icon && <Icon className="w-4 h-4 text-text-secondary" aria-hidden="true" />}
        <span className="text-sm text-text-primary font-medium">
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <>
          <div className="lg:hidden fixed inset-0 z-[55] bg-black/30 animate-backdropFadeIn" onClick={() => setOpen(false)} />
          <div
            id={listboxId}
            role="listbox"
            className="fixed left-4 right-4 bottom-6 lg:bottom-auto lg:absolute lg:left-auto lg:right-0 lg:top-full lg:mt-2 min-w-[180px] bg-card rounded-2xl border border-border-card shadow-xl shadow-black/20 overflow-hidden z-[60] py-1 animate-popoverScaleIn pb-[env(safe-area-inset-bottom)] lg:pb-1"
          >
            {options.map((opt, idx) => {
              const isSelected = value === opt.value;
              const isHighlighted = idx === highlight;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  onMouseEnter={() => setHighlight(idx)}
                  className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-3 text-sm transition-colors duration-100
                    ${isSelected
                      ? 'bg-card-lighter text-text-light font-medium'
                      : isHighlighted
                        ? 'bg-card-light text-text-light'
                        : 'text-text-card-muted hover:bg-card-light hover:text-text-light'
                    }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-profit" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
