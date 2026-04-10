import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Trash2, FileSpreadsheet, Circle } from 'lucide-react';
import { getUploads, deleteUpload } from '../../db/database';

export default function UploadHistory({ refreshKey, onDataChange }) {
  const [uploads, setUploads] = useState([]);

  useEffect(() => {
    getUploads().then(setUploads).catch((e) => {
      console.error('Failed to load uploads:', e);
      setUploads([]);
    });
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

  if (uploads.length === 0) return null;

  return (
    <div className="mt-6 max-w-2xl mx-auto">
      <div className="bg-bg-alt rounded-2xl p-5 border border-border-subtle">
        <div className="flex items-center gap-2.5 mb-4">
          <FileSpreadsheet className="w-4 h-4 text-text-secondary" />
          <h3 className="text-sm font-semibold text-text-primary">Upload History</h3>
        </div>
        <div className="space-y-2">
          {uploads.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-3 px-4 bg-bg rounded-xl border border-border-subtle">
              <div className="flex items-center gap-3">
                <Circle className="w-2 h-2 fill-profit text-profit shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary">{u.accountName || u.fileName}</p>
                    {u.accountName && <span className="text-[10px] text-text-muted">({u.fileName})</span>}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {u.tradeCount} trades &middot; {format(parseISO(u.uploadedAt), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              <button onClick={() => handleDelete(u.id)} className="p-2 text-text-muted hover:text-loss rounded-xl hover:bg-loss-bg transition-colors duration-150">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
