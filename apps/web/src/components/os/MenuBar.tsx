'use client';

import React, { useState } from 'react';
import { Search, Maximize, Minimize } from 'lucide-react';
import { Clock } from './Clock';

export function MenuBar() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="flex items-center justify-between h-[28px] bg-[#0f1219] text-[#e2e8f0] px-3 border-b border-[#2a2f45] select-none shrink-0 font-mono text-xs z-50">
      {/* Left side */}
      <div className="flex items-center space-x-4 h-full">
        <div className="flex items-center space-x-1 font-bold">
          <span className="text-[#d4a843]">HUL</span>
          <span className="text-[#0a6e5c]">SCM OS</span>
        </div>
        <div className="flex items-center space-x-3 text-[#94a3b8]">
          <span className="hover:text-white cursor-pointer">File</span>
          <span className="hover:text-white cursor-pointer">View</span>
          <span className="hover:text-white cursor-pointer">Settings</span>
        </div>
      </div>

      {/* Center side */}
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"></div>
        <span className="text-[#94a3b8] font-medium tracking-widest">ORION ONLINE</span>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4 h-full">
        <div className="flex items-center space-x-1.5 mr-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></div>
          <span className="text-[#94a3b8]">OPERATIONAL</span>
        </div>
        <Search className="w-3.5 h-3.5 text-[#94a3b8] cursor-pointer hover:text-white" />
        <button onClick={toggleFullscreen} className="text-[#94a3b8] hover:text-white focus:outline-none flex items-center" title="Toggle Fullscreen">
          {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
        </button>
        <Clock />
      </div>
    </div>
  );
}
