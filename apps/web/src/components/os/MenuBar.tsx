'use client';
import { useOSStore } from '@/lib/store/os';
import { useState, useEffect } from 'react';
import clsx from 'clsx';

export function MenuBar() {
  const focusedWindowId = useOSStore(state => state.focusedWindowId);
  const windows = useOSStore(state => state.windows);
  const isLiveSolver = useOSStore(state => state.isLiveSolver);
  const isLiveLLM = useOSStore(state => state.isLiveLLM);
  const openWindow = useOSStore(state => state.openWindow);
  
  const focusedWindow = focusedWindowId ? windows[focusedWindowId] : null;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);


  return (
    <div className="absolute top-0 left-0 right-0 h-[30px] bg-[var(--sys-teal)] text-[var(--sys-white)] border-b border-sys-black z-[9999] flex items-center justify-between px-2 font-sans font-semibold text-sm select-none shadow-md">
      <div className="flex items-center gap-4 h-full">
        {/* HUL SCM OS Wordmark */}
        <div className="h-full flex items-center px-3 tracking-widest text-[var(--sys-amber)] border-r border-sys-black/20 bg-black/10">
          HUL SCM OS
        </div>
        
        {/* App Menus */}
        <div className="flex relative items-center gap-1">
          <div className="relative group h-full flex items-center">
            <span className="cursor-pointer bg-[var(--sys-amber)] text-[var(--sys-black)] px-3 py-0.5 rounded-sm shadow-sm inline-block">File</span>
            <div className="absolute top-[28px] left-0 bg-sys-white border border-sys-black text-sys-black shadow-[2px_2px_0_rgba(31,41,55,1)] w-40 flex flex-col py-1 hidden group-hover:flex">
              <span className="px-3 py-1.5 hover:bg-[var(--sys-teal)] hover:text-sys-white cursor-pointer transition-colors">New Scenario</span>
              <span className="px-3 py-1.5 hover:bg-[var(--sys-teal)] hover:text-sys-white cursor-pointer transition-colors">Open...</span>
              <div className="h-[1px] bg-sys-black/10 my-1 w-full" />
              <span className="px-3 py-1.5 hover:bg-[var(--sys-teal)] hover:text-sys-white cursor-pointer transition-colors">Quit</span>
            </div>
          </div>
          <span className="cursor-pointer hover:bg-black/20 px-3 py-0.5 rounded-sm transition-colors">View</span>
          <span className="cursor-pointer hover:bg-black/20 px-3 py-0.5 rounded-sm transition-colors">Settings</span>
        </div>
      </div>
      
      {/* Right side status */}
      <div className="flex items-center gap-3 h-full">
        {/* Orion System Agent Button */}
        <div 
          className="h-full flex items-center px-4 bg-[var(--sys-amber)] text-sys-black cursor-pointer hover:brightness-110 transition-all font-bold gap-2 shadow-[inset_0_-2px_0_rgba(0,0,0,0.1)] border-x border-sys-black"
          onClick={() => openWindow('copilot', 'Orion Orchestrator', { width: 450, height: 750 })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon>
            <line x1="12" y1="22" x2="12" y2="15.5"></line>
            <polyline points="22 8.5 12 15.5 2 8.5"></polyline>
            <polyline points="2 15.5 12 8.5 22 15.5"></polyline>
            <line x1="12" y1="2" x2="12" y2="8.5"></line>
          </svg>
          ORION
        </div>

        <div className="flex items-center text-[10px] gap-1 px-1 font-mono font-bold uppercase tracking-wide">
          <span className={clsx("px-1.5 py-0.5 rounded-sm border border-sys-black/20", isLiveSolver ? "bg-green-500 text-sys-black" : "bg-black/20 text-sys-white/50")}>
            {isLiveSolver ? "SOLVER LIVE" : "CACHED"}
          </span>
        </div>
        
        <div className="relative h-[20px] w-[180px] bg-sys-white/10 rounded-sm border border-sys-white/20 px-2 flex items-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-white/50 mr-2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder="Search Node/SKU..." 
            className="bg-transparent outline-none w-full text-xs font-sans placeholder-white/50 text-white" 
            onFocus={(e) => {
              const overlay = document.getElementById('global-search-overlay');
              if(overlay) overlay.classList.remove('hidden');
            }}
            onBlur={(e) => {
              setTimeout(() => {
                const overlay = document.getElementById('global-search-overlay');
                if(overlay) overlay.classList.add('hidden');
              }, 200);
            }}
          />
          <div id="global-search-overlay" className="absolute top-[28px] right-0 w-[300px] bg-white border border-sys-black shadow-[4px_4px_0_rgba(0,0,0,1)] text-sys-black hidden flex-col font-sans z-[99999]">
             <div className="bg-[var(--sys-teal)] text-white px-3 py-1 font-bold text-xs">Search Results</div>
             <div className="p-2 text-xs flex flex-col gap-1">
                 <div className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center border-b border-gray-100">
                     <div>
                         <div className="font-bold">SKU-001 (Shampoo 500ml)</div>
                         <div className="text-gray-500 font-mono text-[10px]">Strategic | 32,000 U in stock</div>
                     </div>
                     <span className="text-[10px] bg-gray-200 px-1 rounded">Inventory</span>
                 </div>
                 <div className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center">
                     <div>
                         <div className="font-bold">Nagpur CFA</div>
                         <div className="text-gray-500 font-mono text-[10px]">Warehouse | Cap: 50,000 MT</div>
                     </div>
                     <span className="text-[10px] bg-gray-200 px-1 rounded">Network</span>
                 </div>
             </div>
          </div>
        </div>
        
        <div className="h-full px-3 flex items-center text-sm font-mono tracking-wider opacity-80 border-l border-white/10">
          {mounted ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
        </div>
      </div>
    </div>
  );
}
