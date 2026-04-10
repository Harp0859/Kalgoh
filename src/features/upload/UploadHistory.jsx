import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Trash2, FileSpreadsheet, Circle } from 'lucide-react';
import { getUploads, deleteUpload } from '../../db/database';

export default function UploadHistory({ refreshKey, onDataChange }) {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getUploads()
      .then((rows) => {
        setUploads(rows);
      })
      .catch((e) => {
        console.error('Failed to load uploads:', e);
        setUploads([]);
      })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  async function handleDelete(id) {
    try {
      await deleteUpload(id);
      const updated = await getUploads();
      setUploads(updated);
      onDataChange?.();
    } catch (e) {
      console.error('Failed to delete upload:', e);
    }
  }

  if (!loading && uploads.length === 0) return null;

  return (
    <div className="mt-6 max-w-2xl mx-auto">
      <div className="bg-bg-alt rounded-2xl p-5 border border-border-subtle shadow-lg shadow-black/5">
        <div className="flex items-center gap-2.5 mb-4">
          <FileSpreadsheet className="w-4 h-4 text-text-secondary" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-text-primary">Upload History</h3>
        </div>
        <div className="space-y-2">
          {loading ? (
            // Skeleton rows
            [0, 1, 2].map((i) => (
              <div
                key={i}
                className="py-3 px-4 bg-bg rounded-xl border border-border-subtle animate-skeleton"
                aria-hidden="true"
              >
                <div className="h-3 w-40 bg-border-subtle rounded mb-2" />
                <div className="h-2.5 w-56 bg-border-subtle rounded" />
              </div>
            ))
          ) : (
            uploads.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-3 px-4 bg-bg rounded-xl border border-border-subtle gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Circle className="w-2 h-2 fill-profit text-profit shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-text-primary truncate">{u.accountName || u.fileName}</p>
                      {u.accountName && <span className="text-[11px] text-text-muted truncate">({u.fileName})</span>}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5 tabular-nums">
                      {u.tradeCount} trades &middot; {format(parseISO(u.uploadedAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(u.id)}
                  aria-label={`Delete upload ${u.accountName || u.fileName}`}
                  className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-loss rounded-xl hover:bg-loss-bg transition-colors duration-150 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-loss/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-alt"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
