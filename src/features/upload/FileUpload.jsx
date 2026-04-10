import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle, Loader2, ArrowUpRight } from 'lucide-react';
import { parseFile } from '../../utils/parseFile';
import { saveTrades } from '../../db/database';

export default function FileUpload({ onUploadComplete }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [results, setResults] = useState([]);
  const [errors, setErrors] = useState([]);
  const fileRef = useRef();

  async function handleFiles(files) {
    if (files.length === 0) return;

    setUploading(true);
    setResults([]);
    setErrors([]);
    setProgress({ current: 0, total: files.length, fileName: '' });

    const newResults = [];
    const newErrors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ current: i + 1, total: files.length, fileName: file.name });

      try {
        const { trades, meta } = await parseFile(file);
        const { newCount, skippedCount } = await saveTrades(trades, file.name, meta);
        const label = meta?.accountName || file.name;
        newResults.push({ fileName: label, newCount, skippedCount });
      } catch (e) {
        newErrors.push({ fileName: file.name, message: e.message });
      }
    }

    setResults(newResults);
    setErrors(newErrors);
    setUploading(false);
    if (newResults.length > 0) onUploadComplete?.();
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const files = [...e.dataTransfer.files];
    if (files.length > 0) handleFiles(files);
  }

  function onFileSelect(e) {
    const files = [...e.target.files];
    if (files.length > 0) handleFiles(files);
    e.target.value = '';
  }

  const totalNew = results.reduce((s, r) => s + r.newCount, 0);
  const totalSkipped = results.reduce((s, r) => s + r.skippedCount, 0);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Drop zone */}
      <div
        className={`rounded-3xl p-16 text-center cursor-pointer transition-all duration-200
          ${dragOver
            ? 'bg-card scale-[1.02] border-2 border-solid border-profit'
            : 'bg-card border-2 border-dashed border-border-card hover:bg-card-light hover:border-text-card-muted/30'
          }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,.txt"
          multiple
          className="hidden"
          onChange={onFileSelect}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-text-card-muted animate-spin" />
            <div>
              <p className="text-base text-text-card-muted">
                Processing file {progress.current} of {progress.total}
              </p>
              <p className="text-xs text-text-card-muted/60 mt-1">{progress.fileName}</p>
            </div>
            {/* Progress bar */}
            <div className="w-48 h-1.5 bg-card-lighter rounded-full overflow-hidden">
              <div
                className="h-full bg-profit rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-card-lighter flex items-center justify-center animate-float">
              <Upload className="w-6 h-6 text-text-card-muted" />
            </div>
            <div>
              <p className="text-lg font-semibold text-text-light">Drop your MT5 reports here</p>
              <p className="text-sm text-text-card-muted mt-1.5">Select multiple files at once &middot; .xlsx, .xls, .csv</p>
            </div>
            <button className="px-6 py-2.5 bg-card-lighter hover:bg-card-light text-text-light rounded-xl text-sm font-medium flex items-center gap-2 transition-colors duration-200">
              Browse Files
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-5 p-4 bg-profit-bg rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-profit shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-profit">
                {results.length} file{results.length !== 1 ? 's' : ''} uploaded
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {totalNew} new trade{totalNew !== 1 ? 's' : ''} imported
                {totalSkipped > 0 && <span className="text-text-muted"> &middot; {totalSkipped} duplicate{totalSkipped !== 1 ? 's' : ''} skipped</span>}
              </p>
            </div>
            <button onClick={() => setResults([])} className="text-text-muted hover:text-text-primary p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Per-file breakdown */}
          {results.length > 1 && (
            <div className="mt-2 pt-2 border-t border-profit/20 space-y-1">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">{r.fileName}</span>
                  <span className="text-text-muted">
                    {r.newCount} new{r.skippedCount > 0 ? `, ${r.skippedCount} skipped` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mt-5 p-4 bg-loss-bg rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <X className="w-5 h-5 text-loss shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-loss">
                {errors.length} file{errors.length !== 1 ? 's' : ''} failed
              </p>
            </div>
            <button onClick={() => setErrors([])} className="text-text-muted hover:text-text-primary p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            {errors.map((err, i) => (
              <div key={i} className="text-xs">
                <span className="text-text-secondary">{err.fileName}</span>
                <span className="text-text-muted"> — {err.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Format info */}
      <div className="mt-5 bg-bg-alt rounded-2xl p-5 border border-border-subtle">
        <div className="flex items-center gap-2.5 mb-3">
          <FileSpreadsheet className="w-4 h-4 text-text-secondary" />
          <p className="text-sm font-semibold text-text-primary">Supported Formats</p>
        </div>
        <ul className="text-sm text-text-secondary space-y-1.5 pl-7">
          <li>MT5 Trade History Report (.xlsx) — exported from MetaTrader 5</li>
          <li>CSV exports with columns: Time, Symbol, Type, Volume, Price, Profit</li>
          <li>Select multiple files or drag-and-drop a batch — duplicates are auto-skipped</li>
        </ul>
      </div>
    </div>
  );
}
