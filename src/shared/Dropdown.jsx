import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function Dropdown({ value, onChange, options, icon: Icon, placeholder = 'Select...' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-alt border border-border-subtle hover:border-border transition-colors duration-150 cursor-pointer"
      >
        {Icon && <Icon className="w-3.5 h-3.5 text-text-secondary" />}
        <span className="text-sm text-text-primary font-medium">
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="lg:hidden fixed inset-0 z-[55] bg-black/30" onClick={() => setOpen(false)} />
          <div className="fixed left-4 right-4 bottom-6 lg:bottom-auto lg:absolute lg:left-auto lg:right-0 lg:top-full lg:mt-2 min-w-[180px] bg-card rounded-xl border border-border-card shadow-2xl shadow-black/20 overflow-hidden z-[60] py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3.5 py-3 lg:py-2.5 text-sm transition-colors duration-100
                  ${value === opt.value
                    ? 'bg-card-lighter text-text-light font-medium'
                    : 'text-text-card-muted hover:bg-card-light hover:text-text-light'
                  }`}
              >
                <span>{opt.label}</span>
                {value === opt.value && <Check className="w-3.5 h-3.5 text-profit" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
