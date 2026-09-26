'use client';
import { useOSStore } from '@/lib/store/os';
import { useState, useEffect } from 'react';
import clsx from 'clsx';

export function BottomBar() {
  const crtEnabled = useOSStore(state => state.crtEnabled);
  const setCrtEnabled = useOSStore(state => state.setCrtEnabled);
  const desktopColor = useOSStore(state => state.desktopColor);
  const setDesktopColor = useOSStore(state => state.setDesktopColor);
  const windows = useOSStore(state => state.windows);
  const focusedWindowId = useOSStore(state => state.focusedWindowId);
  const focusWindow = useOSStore(state => state.focusWindow);
  
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[24px] bottom-bar z-[9999] justify-between">
      <div className="flex items-center gap-1 h-full px-2 flex-1 overflow-x-auto">
        <div 
          className="flex items-center gap-1 cursor-pointer hover:bg-sys-black hover:text-sys-white px-2 border border-transparent mr-2"
          onClick={() => setCrtEnabled(!crtEnabled)}
        >
          <div className="w-3 h-2 border border-current flex items-center justify-center">
            <div className="w-1 h-0.5 bg-current opacity-50" />
          </div>
          <span>CRT</span>
        </div>
        
        {/* Open Windows Tabs */}
        {Object.values(windows).map(win => (
            <div 
               key={win.id}
               onClick={() => focusWindow(win.id)}
               className={clsx(
                   "px-2 py-0.5 border border-sys-black text-[10px] cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]",
                   focusedWindowId === win.id ? "bg-[var(--sys-amber)] font-bold shadow-[inset_1px_1px_0_rgba(255,255,255,0.5)]" : "bg-white hover:bg-gray-100"
               )}
            >
                {win.title}
            </div>
        ))}
      </div>
      
      <div className="flex items-center gap-4 h-full text-xs">
        <div className="flex items-center gap-1">
          <span>VOL:</span>
          <div className="w-[100px] h-2 bg-gray-300 border border-sys-black shadow-[inset_1px_1px_0_rgba(0,0,0,0.2)] flex items-center px-0.5">
            <div className="h-3 w-2 bg-sys-white border border-sys-black shadow-[1px_1px_0_rgba(0,0,0,1)] translate-x-[70px]" />
          </div>
          <span>70%</span>
          <span className="text-red-500 bg-red-100 border border-red-500 px-1 ml-1 text-[9px]">MUTED</span>
        </div>
        
        <div className="px-3 border-l border-gray-400">
          {date}
        </div>
        <div className="px-3 border-l border-gray-400 flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {time}
        </div>
      </div>
    </div>
  );
}
