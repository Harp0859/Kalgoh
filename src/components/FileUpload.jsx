import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle, Loader2 } from 'lucide-react';
import { parseFile } from '../utils/parseFile';
import { saveTrades } from '../db/database';

export default function FileUpload({ onUploadComplete }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  async function handleFile(file) {
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const { trades, meta } = await parseFile(file);
      await saveTrades(trades, file.name, meta);
      const label = meta?.accountName || file.name;
      setResult({ fileName: label, count: trades.length });
      onUploadComplete?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onFileSelect(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
          ${dragOver ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-border hover:border-primary/50 hover:bg-surface-light/50'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,.txt"
          className="hidden"
          onChange={onFileSelect}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-lg text-text-muted">Parsing your trades...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium text-text">Drop your MT5 report here</p>
              <p className="text-sm text-text-muted mt-1">Supports .xlsx, .xls, .csv files</p>
            </div>
            <button className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-medium transition-colors">
              Browse Files
            </button>
          </div>
        )}
      </div>

      {result && (
        <div className="mt-6 p-4 bg-profit/10 border border-profit/30 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-profit shrink-0" />
          <div className="text-left">
            <p className="text-sm font-medium text-profit">Upload successful</p>
            <p className="text-xs text-text-muted mt-0.5">
              <span className="text-text">{result.count}</span> trades imported from{' '}
              <span className="text-text">{result.fileName}</span>
            </p>
          </div>
          <button onClick={() => setResult(null)} className="ml-auto text-text-muted hover:text-text">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-loss/10 border border-loss/30 rounded-xl flex items-center gap-3">
          <X className="w-5 h-5 text-loss shrink-0" />
          <div className="text-left">
            <p className="text-sm font-medium text-loss">Upload failed</p>
            <p className="text-xs text-text-muted mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-text-muted hover:text-text">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="mt-8 p-5 bg-surface rounded-xl border border-border">
        <div className="flex items-center gap-3 mb-3">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          <p className="text-sm font-medium text-text">Supported MT5 Export Formats</p>
        </div>
        <ul className="text-xs text-text-muted space-y-1.5 text-left pl-8">
          <li>MT5 Trade History Report (.xlsx) - exported from MetaTrader 5</li>
          <li>CSV exports with columns: Time, Symbol, Type, Volume, Price, Profit</li>
          <li>Multiple uploads merge into the same dashboard</li>
        </ul>
      </div>
    </div>
  );
}
