import { useState, useEffect, useRef } from 'react';
import { X, StickyNote, Save } from 'lucide-react';
import { getNote, saveNote } from '../../db/database';
import { formatTimeUTC, formatDateLongUTC } from '../../utils/dateFormat';

const formatTime = formatTimeUTC;

export default function DayModal({ dateKey, trades, account, onClose }) {
  const [note, setNote] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef(null);
  const textareaRef = useRef(null);

  const dayProfit = trades.reduce((s, t) => s + (t.profit || 0), 0);
  const wins = trades.filter((t) => (t.profit || 0) > 0).length;
  const losses = trades.filter((t) => (t.profit || 0) < 0).length;

  useEffect(() => {
    getNote(dateKey, account || 'all')
      .then((text) => {
        setNote(text);
        setSavedNote(text);
      })
      .catch((e) => {
        console.error('Failed to load note:', e);
      });
  }, [dateKey, account]);

  // Escape key closes the modal.
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Focus trap.
  useEffect(() => {
    function handleTab(e) {
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, []);

  // Focus the textarea when the modal opens.
  useEffect(() => {
    const id = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  async function handleSaveNote() {
    setSaving(true);
    try {
      await saveNote(dateKey, account || 'all', note);
      setSavedNote(note);
    } catch (e) {
      console.error('Failed to save note:', e);
    } finally {
      setSaving(false);
    }
  }

  const noteChanged = note !== savedNote;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose} role="presentation">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-backdropFadeIn" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-modal-title"
        className="card-premium relative bg-card rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl shadow-black/50 animate-dialogScaleIn pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5 gap-3">
          <div className="min-w-0">
            <h3 id="day-modal-title" className="text-xl font-bold text-text-light truncate">
              {formatDateLongUTC(dateKey + 'T00:00:00Z')}
            </h3>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-text-card-muted tabular-nums">{trades.length} trades</span>
              <span className="text-xs text-text-card-muted tabular-nums">{wins}W / {losses}L</span>
              <span className={`text-sm font-bold tabular-nums ${dayProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                {dayProfit >= 0 ? '+' : ''}${dayProfit.toFixed(2)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close day details"
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-card-lighter text-text-card-muted hover:text-text-light transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Daily Note */}
        <div className="mb-5 bg-card-lighter rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-text-card-muted" aria-hidden="true" />
              <span className="text-[11px] font-medium text-text-card-muted uppercase tracking-wider">Daily Note</span>
            </div>
            {noteChanged && (
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={saving}
                className="min-h-[36px] flex items-center gap-1.5 text-xs font-medium text-profit bg-profit/10 px-3 py-2 rounded-lg hover:bg-profit/15 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-profit/50"
              >
                <Save className="w-3.5 h-3.5" aria-hidden="true" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
          <label htmlFor="day-note" className="sr-only">Daily note</label>
          <textarea
            id="day-note"
            ref={textareaRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened today? What went well? What to improve?"
            className="w-full bg-transparent text-sm text-text-light placeholder-text-card-muted/50 resize-none focus:outline-none min-h-[72px]"
            rows={3}
          />
        </div>

        {/* Trades list */}
        <div className="space-y-2">
          {trades
            .sort((a, b) => (a.closeTime || '').localeCompare(b.closeTime || ''))
            .map((trade, i) => (
              <div key={trade.id || i} className="flex items-center justify-between bg-card-lighter rounded-xl p-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wide shrink-0
                    ${(trade.type || '').toLowerCase() === 'buy' ? 'bg-profit/12 text-profit' : 'bg-loss/12 text-loss'}`}>
                    {trade.type}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-light truncate">{trade.symbol}</p>
                    <p className="text-xs text-text-card-muted tabular-nums">
                      {formatTime(trade.openTime)} → {formatTime(trade.closeTime)}
                      {trade.volume ? ` · ${trade.volume} lot` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold tabular-nums ${(trade.profit || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {(trade.profit || 0) >= 0 ? '+' : ''}${(trade.profit || 0).toFixed(2)}
                  </p>
                  {(trade.commission || trade.swap) ? (
                    <p className="text-[11px] text-text-card-muted tabular-nums">
                      comm: {(trade.commission || 0).toFixed(2)} · swap: {(trade.swap || 0).toFixed(2)}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
