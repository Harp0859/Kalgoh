import { Upload, Inbox } from 'lucide-react';

export function EmptyState({ message, dark, icon: Icon = Inbox, cta, onCtaClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${dark ? 'bg-card-lighter' : 'bg-card'}`}>
        <Icon className="w-5 h-5 text-text-card-muted" aria-hidden="true" />
      </div>
      <p className={`text-sm ${dark ? 'text-text-card-muted' : 'text-text-muted'}`}>
        {message}
      </p>
      {cta && onCtaClick && (
        <button
          type="button"
          onClick={onCtaClick}
          className="mt-4 px-4 py-2 bg-card text-text-light rounded-xl text-xs font-medium hover:bg-card-light focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-colors duration-200"
        >
          {cta}
        </button>
      )}
    </div>
  );
}

export function NoDataState({ onGoToUpload }) {
  return (
    <div className="flex flex-col items-center justify-center py-28">
      <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-5">
        <Upload className="w-7 h-7 text-text-card-muted" aria-hidden="true" />
      </div>
      <p className="text-text-secondary text-base mb-4">No trades loaded yet</p>
      <button
        type="button"
        onClick={onGoToUpload}
        aria-label="Go to upload report page"
        className="px-5 py-2.5 bg-card text-text-light rounded-xl text-sm font-medium hover:bg-card-light focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-colors duration-200"
      >
        Upload Report
      </button>
    </div>
  );
}
