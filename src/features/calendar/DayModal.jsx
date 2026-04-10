import { useState, useEffect } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { X, StickyNote, Save } from 'lucide-react';
import { getNote, saveNote } from '../../db/database';

function formatTime(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, 'HH:mm:ss') : '-';
  } catch {
    return '-';
  }
}

export default function DayModal({ dateKey, trades, account, onClose }) {
  const [note, setNote] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const [saving, setSaving] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-card rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-text-light">
              {format(new Date(dateKey), 'EEEE, MMMM d, yyyy')}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-text-card-muted">{trades.length} trades</span>
              <span className="text-xs text-text-card-muted">{wins}W / {losses}L</span>
              <span className={`text-sm font-bold ${dayProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                {dayProfit >= 0 ? '+' : ''}${dayProfit.toFixed(2)}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-card-lighter text-text-card-muted hover:text-text-light transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Daily Note */}
        <div className="mb-5 bg-card-lighter rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <StickyNote className="w-3.5 h-3.5 text-text-card-muted" />
              <span className="text-xs font-medium text-text-card-muted uppercase tracking-wider">Daily Note</span>
            </div>
            {noteChanged && (
              <button
                onClick={handleSaveNote}
                disabled={saving}
                className="flex items-center gap-1.5 text-[11px] font-medium text-profit bg-profit/10 px-2.5 py-1 rounded-lg hover:bg-profit/15 transition-colors"
              >
                <Save className="w-3 h-3" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened today? What went well? What to improve?"
            className="w-full bg-transparent text-sm text-text-light placeholder-text-card-muted/50 resize-none focus:outline-none min-h-[60px]"
            rows={3}
          />
        </div>

        {/* Trades list */}
        <div className="space-y-2">
          {trades
            .sort((a, b) => (a.closeTime || '').localeCompare(b.closeTime || ''))
            .map((trade, i) => (
              <div key={trade.id || i} className="flex items-center justify-between bg-card-lighter rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide
                    ${(trade.type || '').toLowerCase() === 'buy' ? 'bg-profit/12 text-profit' : 'bg-loss/12 text-loss'}`}>
                    {trade.type}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-text-light">{trade.symbol}</p>
                    <p className="text-[11px] text-text-card-muted">
                      {formatTime(trade.openTime)} → {formatTime(trade.closeTime)}
                      {trade.volume ? ` · ${trade.volume} lot` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${(trade.profit || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {(trade.profit || 0) >= 0 ? '+' : ''}${(trade.profit || 0).toFixed(2)}
                  </p>
                  {(trade.commission || trade.swap) ? (
                    <p className="text-[10px] text-text-card-muted">
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
