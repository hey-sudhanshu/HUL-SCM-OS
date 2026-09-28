'use client';

import React from 'react';
import { Clock } from './Clock';
import { useOSStore } from '@/lib/store/os';
import { getAppIcon } from './Icon';

export function BottomBar() {
  const { windows, focusedWindowId, setFocus } = useOSStore();
  
  return (
    <div className="flex items-center justify-between h-[36px] bg-[#0f1219] text-[#e2e8f0] px-3 border-t border-[#2a2f45] select-none shrink-0 font-mono text-xs z-50">
      {/* Left side */}
      <div className="flex items-center h-full">
        <div className="flex items-center bg-[#1a1f36] border border-[#2a2f45] px-2 py-1 rounded text-[10px] mr-4">
          <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] mr-1.5"></div>
          <span className="text-[#94a3b8] font-bold">SYS</span>
        </div>
      </div>
      
      {/* Center - Dock */}
      <div className="flex-1 flex items-center justify-center space-x-1 h-full overflow-x-auto no-scrollbar">
        {Object.values(windows || {}).map((win) => {
          const Icon = getAppIcon(win.appId);
          const isActive = win.id === focusedWindowId;
          
          return (
            <button
              key={win.id}
              onClick={() => setFocus(win.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 h-[28px] min-w-[120px] max-w-[200px] rounded transition-colors ${
                isActive 
                  ? 'bg-[#1a1f36] border border-[#0a6e5c] text-white shadow-[0_0_8px_rgba(10,110,92,0.4)]' 
                  : 'bg-transparent border border-transparent hover:bg-[#1a1f36] text-[#94a3b8] hover:text-white'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#0a6e5c]' : ''}`} />
              <span className="truncate text-[11px] font-medium">{win.title}</span>
            </button>
          );
        })}
      </div>
      
      {/* Right side */}
      <div className="flex items-center space-x-4 h-full ml-4">
        <div className="flex items-center space-x-1.5">
          <span className="text-[#94a3b8]">NET:</span>
          <span className="text-[#22c55e]">9ms</span>
        </div>
        <div className="w-[1px] h-3 bg-[#2a2f45]"></div>
        <Clock />
      </div>
    </div>
  );
}
