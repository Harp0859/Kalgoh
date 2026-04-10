import { LayoutDashboard, Calendar, Table2, Upload, Settings, BarChart3, X } from 'lucide-react';

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'trades', label: 'Trades', icon: Table2 },
  { id: 'upload', label: 'Upload', icon: Upload },
];

export default function Sidebar({ tab, setTab, hasTrades, mobileOpen, setMobileOpen }) {
  function handleNav(id) {
    setTab(id);
    setMobileOpen(false);
  }

  function NavItem({ id, label, icon: Icon, disabled }) {
    const active = tab === id;
    return (
      <button
        onClick={() => !disabled && handleNav(id)}
        disabled={disabled}
        className={`flex items-center gap-3 h-10 w-full px-3 rounded-xl transition-all duration-150
          ${active
            ? 'bg-card-lighter text-text-light'
            : disabled
              ? 'text-text-card-muted/20 cursor-not-allowed'
              : 'text-text-card-muted hover:text-text-light hover:bg-card-light'
          }`}
      >
        <Icon className="w-[18px] h-[18px] shrink-0" />
        <span className="text-sm font-medium">{label}</span>
      </button>
    );
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 w-[200px] bg-card flex-col justify-between py-5">
        <div>
          <div className="px-5 mb-8">
            <span className="text-2xl font-bold text-text-light tracking-tight">Kalgoh</span>
          </div>
          <nav className="flex flex-col gap-1 px-2">
            {NAV.map(({ id, label, icon }) => (
              <NavItem key={id} id={id} label={label} icon={icon} disabled={id !== 'upload' && !hasTrades} />
            ))}
          </nav>
        </div>
        <div className="px-2">
          <NavItem id="settings" label="Settings" icon={Settings} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[260px] bg-card flex flex-col justify-between py-5 shadow-2xl shadow-black/30 animate-slideIn">
            <div>
              <div className="px-5 mb-6 flex items-center justify-between">
                <span className="text-2xl font-bold text-text-light tracking-tight">Kalgoh</span>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-card-lighter text-text-card-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1 px-2">
                {NAV.map(({ id, label, icon }) => (
                  <NavItem key={id} id={id} label={label} icon={icon} disabled={id !== 'upload' && !hasTrades} />
                ))}
              </nav>
            </div>
            <div className="px-2">
              <NavItem id="settings" label="Settings" icon={Settings} />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
