import { useEffect, useRef } from 'react';

import { LayoutDashboard, Calendar, Table2, Upload, Settings, BarChart3, X } from 'lucide-react';

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'trades', label: 'Trades', icon: Table2 },
  { id: 'upload', label: 'Connect', icon: Upload },
];

function NavItem({ id, label, icon: Icon, disabled, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onSelect(id)}
      disabled={disabled}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      className={`flex items-center gap-3 h-11 lg:h-10 w-full px-3 rounded-xl transition-all duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-card
        ${active
          ? 'bg-card-lighter text-text-light'
          : disabled
            ? 'text-text-card-muted/20 cursor-not-allowed'
            : 'text-text-card-muted hover:text-text-light hover:bg-card-light'
        }`}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

export default function Sidebar({ tab, setTab, hasTrades, mobileOpen, setMobileOpen }) {
  const drawerRef = useRef(null);
  const closeBtnRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  function handleNav(id) {
    setTab(id);
    setMobileOpen(false);
  }

  // Mobile drawer: Escape to close + simple focus trap + restore focus on close.
  useEffect(() => {
    if (!mobileOpen) return;

    previouslyFocusedRef.current = document.activeElement;

    // Move initial focus to the close button for predictable keyboard entry.
    // requestAnimationFrame ensures the element is in the DOM before focusing.
    const rafId = requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });

    function getFocusable() {
      const root = drawerRef.current;
      if (!root) return [];
      return Array.from(
        root.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = getFocusable();
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    // Prevent background scroll while drawer is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      // Restore focus to whatever opened the drawer.
      const prev = previouslyFocusedRef.current;
      if (prev && typeof prev.focus === 'function') {
        prev.focus();
      }
    };
  }, [mobileOpen, setMobileOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        aria-label="Primary"
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-30 w-[200px] bg-card flex-col justify-between py-5 pb-safe"
      >
        <div>
          <div className="px-5 mb-8">
            <span className="text-2xl font-bold text-text-light tracking-tight">Kalgoh</span>
          </div>
          <nav aria-label="Main" className="flex flex-col gap-1 px-2">
            {NAV.map(({ id, label, icon }) => (
              <NavItem
                key={id}
                id={id}
                label={label}
                icon={icon}
                active={tab === id}
                disabled={id !== 'upload' && !hasTrades}
                onSelect={handleNav}
              />
            ))}
          </nav>
        </div>
        <div className="px-2">
          <NavItem
            id="settings"
            label="Settings"
            icon={Settings}
            active={tab === 'settings'}
            onSelect={handleNav}
          />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm backdrop-enter"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
            className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[260px] bg-card flex flex-col justify-between py-5 pb-safe shadow-2xl shadow-black/30 animate-slideIn"
          >
            <div>
              <div className="px-5 mb-6 flex items-center justify-between">
                <span className="text-2xl font-bold text-text-light tracking-tight">Kalgoh</span>
                <button
                  ref={closeBtnRef}
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="w-11 h-11 -mr-2 inline-flex items-center justify-center rounded-lg hover:bg-card-lighter text-text-card-muted
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
              <nav aria-label="Main" className="flex flex-col gap-1 px-2">
                {NAV.map(({ id, label, icon }) => (
                  <NavItem
                    key={id}
                    id={id}
                    label={label}
                    icon={icon}
                    active={tab === id}
                    disabled={id !== 'upload' && !hasTrades}
                    onSelect={handleNav}
                  />
                ))}
              </nav>
            </div>
            <div className="px-2">
              <NavItem
                id="settings"
                label="Settings"
                icon={Settings}
                active={tab === 'settings'}
                onSelect={handleNav}
              />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
