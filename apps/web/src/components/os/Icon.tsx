import React from 'react';

export function PixelIcon({ type, className }: { type: string, className?: string }) {
  switch (type) {
    case 'folder':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" className={className}>
          <path d="M3 5h6l2 2h10v12H3z" />
        </svg>
      );
    case 'app':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" className={className}>
          <rect x="4" y="4" width="16" height="16" />
          <path d="M4 8h16" />
        </svg>
      );
    case 'info':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" className={className}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4 M12 8h.01" />
        </svg>
      );
    case 'trash':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" className={className}>
          <path d="M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M10 11v6 M14 11v6" />
        </svg>
      );
    default:
      return <div className={`border-2 border-current ${className}`} />;
  }
}
