'use client';
import { useOSStore } from '@/lib/store/os';
import { PixelIcon } from './Icon';
import clsx from 'clsx';

export function BottomBar() {
  const windows = useOSStore(state => state.windows);
  const focusWindow = useOSStore(state => state.focusWindow);

  return (
    <div className="h-12 w-full bg-white/90 backdrop-blur-md border-t border-[var(--sys-border)] flex items-center justify-center gap-2 px-2 z-50 relative shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      {Object.entries(windows).map(([id, win]) => (
        <div
          key={id}
          onClick={() => focusWindow(id)}
          className={clsx(
            "h-10 px-3 min-w-[120px] rounded-md flex items-center gap-2 cursor-pointer transition-all border select-none group relative",
            win.isFocused 
              ? "bg-[var(--sys-teal)] text-white border-transparent shadow-md" 
              : "bg-white text-black/80 border-black/10 hover:bg-black/5 hover:border-black/20"
          )}
        >
          <PixelIcon type="app" className={clsx("w-4 h-4", win.isFocused ? "text-white" : "text-[var(--sys-teal)]")} />
          <span className="text-xs font-semibold truncate">{win.title}</span>
          {win.isFocused && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
          )}
        </div>
      ))}
      {Object.keys(windows).length === 0 && (
        <div className="text-xs text-black/40 italic">No open applications</div>
      )}
    </div>
  );
}
