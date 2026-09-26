'use client';
import { PixelIcon } from './Icon';
import { Clock } from './Clock';

export function MenuBar() {
  return (
    <div className="h-7 w-full bg-[var(--sys-white)] border-b border-[var(--sys-border)] flex items-center justify-between px-3 text-xs font-sans select-none z-50">
      <div className="flex items-center gap-4 h-full">
        <div className="flex items-center gap-2 font-bold text-[var(--sys-teal)]">
          <PixelIcon type="folder" className="w-4 h-4" />
          <span>HUL SCM OS</span>
        </div>
        <div className="flex items-center gap-3 text-black/80 font-medium h-full">
          <span className="hover:bg-black/5 px-2 py-1 rounded cursor-default">File</span>
          <span className="hover:bg-black/5 px-2 py-1 rounded cursor-default">View</span>
          <span className="hover:bg-black/5 px-2 py-1 rounded cursor-default">Settings</span>
          <span className="hover:bg-black/5 px-2 py-1 rounded cursor-default">Help</span>
        </div>
      </div>
      <div className="flex items-center gap-4 h-full text-black/80 font-medium">
        <div className="flex items-center gap-1.5 opacity-80" title="System Status: Online">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]"></div>
          <span>System Normal</span>
        </div>
        <Clock />
      </div>
    </div>
  );
}
