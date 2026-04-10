import { Upload } from 'lucide-react';

export function EmptyState({ message, dark }) {
  return (
    <p className={`text-center py-16 text-sm ${dark ? 'text-text-card-muted' : 'text-text-muted'}`}>
      {message}
    </p>
  );
}

export function NoDataState({ onGoToUpload }) {
  return (
    <div className="flex flex-col items-center justify-center py-28">
      <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-5">
        <Upload className="w-7 h-7 text-text-card-muted" />
      </div>
      <p className="text-text-secondary text-base mb-4">No trades loaded yet</p>
      <button onClick={onGoToUpload} className="px-5 py-2.5 bg-card text-text-light rounded-xl text-sm font-medium hover:bg-card-light transition-colors duration-200">
        Upload Report
      </button>
    </div>
  );
}
