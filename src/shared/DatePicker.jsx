import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, CalendarRange } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isAfter, isBefore, startOfWeek, endOfWeek } from 'date-fns';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function DatePicker({ dateFrom, dateTo, onChangeFrom, onChangeTo, onClear }) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => dateTo ? new Date(dateTo) : new Date());
  const [selecting, setSelecting] = useState('from'); // 'from' | 'to'
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const hasFilter = dateFrom || dateTo;

  const fromDate = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
  const toDate = dateTo ? new Date(dateTo + 'T00:00:00') : null;

  // Build calendar grid for the current view month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewMonth]);

  function handleDayClick(day) {
    const dateStr = format(day, 'yyyy-MM-dd');

    if (selecting === 'from') {
      onChangeFrom(dateStr);
      // If "to" is before the new "from", clear "to"
      if (toDate && isBefore(toDate, day)) {
        onChangeTo('');
      }
      setSelecting('to');
    } else {
      // If clicked date is before "from", swap
      if (fromDate && isBefore(day, fromDate)) {
        onChangeFrom(dateStr);
        onChangeTo(dateFrom);
      } else {
        onChangeTo(dateStr);
      }
      setSelecting('from');
    }
  }

  function isInRange(day) {
    if (!fromDate || !toDate) return false;
    return isAfter(day, fromDate) && isBefore(day, toDate);
  }

  function isRangeStart(day) {
    return fromDate && isSameDay(day, fromDate);
  }

  function isRangeEnd(day) {
    return toDate && isSameDay(day, toDate);
  }

  const displayLabel = hasFilter
    ? `${dateFrom ? format(new Date(dateFrom + 'T00:00:00'), 'MMM d') : '...'} — ${dateTo ? format(new Date(dateTo + 'T00:00:00'), 'MMM d') : '...'}`
    : 'Date range';

  const currentMonthStr = format(viewMonth, 'MMMM yyyy');

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors duration-150 cursor-pointer
          ${hasFilter
            ? 'bg-card text-text-light border-border-card'
            : 'bg-bg-alt text-text-primary border-border-subtle hover:border-border'
          }`}
      >
        <CalendarRange className={`w-3.5 h-3.5 ${hasFilter ? 'text-text-card-muted' : 'text-text-secondary'}`} />
        <span className="text-sm font-medium">{displayLabel}</span>
        {hasFilter && (
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="p-0.5 rounded hover:bg-card-lighter text-text-card-muted hover:text-text-light ml-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </button>

      {/* Calendar popup — fixed overlay on mobile, absolute on desktop */}
      {open && (
        <>
          <div className="lg:hidden fixed inset-0 z-[55] bg-black/30" onClick={() => setOpen(false)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 lg:translate-y-0 lg:absolute lg:left-auto lg:right-0 lg:top-full lg:mt-2 bg-card rounded-2xl border border-border-card shadow-2xl shadow-black/30 p-5 z-[60] lg:w-[320px]">
          {/* Selection tabs */}
          <div className="flex gap-1 mb-4 bg-card-lighter rounded-lg p-0.5">
            <button
              onClick={() => setSelecting('from')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors duration-100
                ${selecting === 'from' ? 'bg-card-light text-text-light' : 'text-text-card-muted hover:text-text-light'}`}
            >
              From: {dateFrom ? format(new Date(dateFrom + 'T00:00:00'), 'MMM d, yyyy') : '—'}
            </button>
            <button
              onClick={() => setSelecting('to')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors duration-100
                ${selecting === 'to' ? 'bg-card-light text-text-light' : 'text-text-card-muted hover:text-text-light'}`}
            >
              To: {dateTo ? format(new Date(dateTo + 'T00:00:00'), 'MMM d, yyyy') : '—'}
            </button>
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-card-lighter text-text-card-muted hover:text-text-light transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-text-light">{currentMonthStr}</span>
            <button
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-card-lighter text-text-card-muted hover:text-text-light transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-text-card-muted py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0">
            {calendarDays.map((day) => {
              const inMonth = day.getMonth() === viewMonth.getMonth();
              const isStart = isRangeStart(day);
              const isEnd = isRangeEnd(day);
              const inRange = isInRange(day);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => inMonth && handleDayClick(day)}
                  disabled={!inMonth}
                  className={`h-9 text-xs font-medium rounded-lg transition-all duration-100 relative
                    ${!inMonth ? 'text-text-card-muted/20 cursor-default' : 'cursor-pointer'}
                    ${isStart || isEnd
                      ? 'bg-text-light text-card font-bold'
                      : inRange
                        ? 'bg-text-light/10 text-text-light'
                        : inMonth
                          ? 'text-text-card-muted hover:bg-card-lighter hover:text-text-light'
                          : ''
                    }
                    ${isToday && !isStart && !isEnd ? 'ring-1 ring-text-card-muted/30' : ''}
                  `}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Quick presets */}
          <div className="flex gap-1.5 mt-4 pt-3 border-t border-border-card">
            {[
              { label: 'Today', fn: () => { const t = format(new Date(), 'yyyy-MM-dd'); onChangeFrom(t); onChangeTo(t); } },
              { label: '7d', fn: () => { const t = new Date(); onChangeTo(format(t, 'yyyy-MM-dd')); t.setDate(t.getDate() - 6); onChangeFrom(format(t, 'yyyy-MM-dd')); } },
              { label: '30d', fn: () => { const t = new Date(); onChangeTo(format(t, 'yyyy-MM-dd')); t.setDate(t.getDate() - 29); onChangeFrom(format(t, 'yyyy-MM-dd')); } },
              { label: 'This month', fn: () => { const t = new Date(); onChangeFrom(format(startOfMonth(t), 'yyyy-MM-dd')); onChangeTo(format(t, 'yyyy-MM-dd')); } },
              { label: 'All', fn: () => { onClear(); } },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => { preset.fn(); setSelecting('from'); }}
                className="flex-1 text-[10px] font-medium text-text-card-muted hover:text-text-light py-1.5 rounded-lg hover:bg-card-lighter transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
