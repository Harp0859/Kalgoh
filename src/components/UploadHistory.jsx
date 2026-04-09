import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Trash2, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { getUploads, deleteUpload, clearAllData } from '../db/database';

export default function UploadHistory({ refreshKey, onDataChange }) {
  const [uploads, setUploads] = useState([]);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    getUploads().then(setUploads);
  }, [refreshKey]);

  async function handleDelete(id) {
    await deleteUpload(id);
    const updated = await getUploads();
    setUploads(updated);
    onDataChange?.();
  }

  async function handleClearAll() {
    await clearAllData();
    setUploads([]);
    setConfirmClear(false);
    onDataChange?.();
  }

  if (uploads.length === 0) return null;

  return (
    <div className="mt-8 bg-surface rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-text">Upload History</h3>
        </div>
        {confirmClear ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-loss">Clear all data?</span>
            <button onClick={handleClearAll} className="text-xs px-2 py-1 bg-loss/20 text-loss rounded hover:bg-loss/30">
              Yes
            </button>
            <button onClick={() => setConfirmClear(false)} className="text-xs px-2 py-1 bg-surface-light text-text-muted rounded hover:bg-surface-lighter">
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            className="text-xs text-text-muted hover:text-loss flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3" />
            Clear All
          </button>
        )}
      </div>
      <div className="space-y-2">
        {uploads.map((u) => (
          <div key={u.id} className="flex items-center justify-between py-2 px-3 bg-surface-light rounded-lg">
            <div>
              <p className="text-sm text-text">{u.fileName}</p>
              <p className="text-xs text-text-muted">
                {u.tradeCount} trades &middot; {format(parseISO(u.uploadedAt), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
            <button
              onClick={() => handleDelete(u.id)}
              className="p-1.5 text-text-muted hover:text-loss rounded-lg hover:bg-loss/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
