'use client';
import { useState, useEffect } from 'react';

export function ScmDeskWidget() {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [networkStats, setNetworkStats] = useState({ nodes: 0, skus: 0 });
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDate(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000); // update every minute
    
    // fetch network basic stats without blocking
    fetch('/precomputed/network.json')
      .then(res => res.json())
      .then(data => {
        setNetworkStats({
            nodes: (data.warehouses?.length || 0) + (data.distributors?.length || 0),
            skus: data.skus?.length || 0
        });
      })
      .catch(() => {});
      
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-10 right-4 w-56 bg-sys-bg border border-sys-black shadow-[4px_4px_0_var(--sys-black)] z-[10] flex flex-col font-sans">
      <div className="bg-[var(--sys-teal)] text-white px-2 py-1 font-bold text-xs flex justify-between items-center border-b border-sys-black">
         <span>HUL SCM Control</span>
         <span className="opacity-80">v2.0</span>
      </div>
      
      <div className="p-3 bg-white flex flex-col gap-3">
          <div className="flex justify-between items-end border-b border-gray-200 pb-2">
              <div className="text-2xl font-bold font-mono tracking-tight">{time}</div>
              <div className="text-xs font-bold text-gray-500 uppercase">{date}</div>
          </div>
          
          <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between items-center">
                  <span className="text-gray-500">Live Network:</span>
                  <span className="font-bold flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> {networkStats.nodes} Nodes
                  </span>
              </div>
              <div className="flex justify-between items-center">
                  <span className="text-gray-500">Materials:</span>
                  <span className="font-bold">{networkStats.skus} SKUs</span>
              </div>
          </div>
          
          <div className="mt-1 pt-2 border-t border-gray-200 text-xs">
              <div className="bg-[var(--sys-amber)]/20 border border-[var(--sys-amber)] p-2 text-sys-black font-bold flex justify-between items-center">
                  <span>System Status</span>
                  <span className="text-[var(--sys-teal)]">OPTIMAL</span>
              </div>
          </div>
      </div>
    </div>
  );
}
