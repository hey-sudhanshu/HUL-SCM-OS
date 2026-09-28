'use client';

import React, { useState, useEffect } from 'react';
import { useOSStore } from '@/lib/store/os';
import { MenuBar } from './MenuBar';
import { BottomBar } from './BottomBar';
import { Window } from './Window';
import { getAppIcon } from './Icon';
import NetworkBrowser from './apps/NetworkBrowser';
import TacticalMap from './apps/TacticalMap';
import WarehouseManager from './apps/WarehouseManager';
import DispatchManager from './apps/DispatchManager';
import RouteOptimizer from './apps/RouteOptimizer';
import FreightCalculator from './apps/FreightCalc';
import InventoryLab from './apps/InventoryLab';
import VendorManager from './apps/VendorManager';
import RiskSimulator from './apps/RiskSimulator';
import { Governance } from './apps/Governance';
import { Orion } from './apps/Orion';
import { Activity, Server, Box, GitMerge } from 'lucide-react';
import { fetchNetworkData } from '@/lib/api';

type AppDefinition = {
  id: string;
  title: string;
  icon: any;
  component: React.ComponentType<any>;
  defaultSize: { width: number; height: number };
};

const APPS: AppDefinition[] = [
  { id: 'network', title: 'Network Browser', icon: 'network', component: NetworkBrowser, defaultSize: { width: 1100, height: 700 } },
  { id: 'tactical', title: 'Tactical Map', icon: 'tactical', component: TacticalMap, defaultSize: { width: 1200, height: 800 } },
  { id: 'warehouse', title: 'Warehouse Manager', icon: 'warehouse', component: WarehouseManager, defaultSize: { width: 1000, height: 650 } },
  { id: 'dispatch', title: 'Dispatch Manager', icon: 'dispatch', component: DispatchManager, defaultSize: { width: 1000, height: 650 } },
  { id: 'route', title: 'Route Optimizer', icon: 'route', component: RouteOptimizer, defaultSize: { width: 1100, height: 700 } },
  { id: 'freight', title: 'Freight Calculator', icon: 'freight', component: FreightCalculator, defaultSize: { width: 950, height: 600 } },
  { id: 'inventory', title: 'Inventory Lab', icon: 'inventory', component: InventoryLab, defaultSize: { width: 1100, height: 700 } },
  { id: 'vendor', title: 'Supply Base', icon: 'vendor', component: VendorManager, defaultSize: { width: 1000, height: 650 } },
  { id: 'risk', title: 'Risk Simulator', icon: 'risk', component: RiskSimulator, defaultSize: { width: 1000, height: 650 } },
  { id: 'governance', title: 'Governance', icon: 'governance', component: Governance, defaultSize: { width: 1000, height: 600 } },
  { id: 'orion', title: 'Orion', icon: 'orion', component: Orion, defaultSize: { width: 700, height: 600 } }
];

const WALLPAPERS = [
  'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-950',
  'bg-[#0f1219]',
  'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwem0yMCAyMGMwIDUuNS00LjUgMTAtMTAgMTBTMCAyNS41IDAgMjAgNC41IDEwIDEwIDEwczEwIDQuNSAxMCAxMHoiIGZpbGw9IiMzMzMiIGZpbGwtb3BhY2l0eT0iLjEiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg==")] bg-repeat',
  'bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900',
  'bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] bg-slate-950'
];

export function Desktop() {
  const { windows, openWindow, bringToFront, closeWindow, minimizeWindow, toggleMaximize } = useOSStore();
  const [wallpaperIndex, setWallpaperIndex] = useState(0);
  const [stats, setStats] = useState({ nodes: 0, lanes: 0, skus: 0 });

  useEffect(() => {
    const saved = localStorage.getItem('hul-os-wallpaper');
    if (saved) setWallpaperIndex(parseInt(saved, 10));

    fetchNetworkData().then(data => {
      if (data) {
        setStats({
          nodes: (data.plants?.length || 0) + (data.warehouses?.length || 0) + (data.distributors?.length || 0),
          lanes: data.lanes?.length || 0,
          skus: data.skus?.length || 0
        });
      }
    });
  }, []);

  const cycleWallpaper = () => {
    const next = (wallpaperIndex + 1) % WALLPAPERS.length;
    setWallpaperIndex(next);
    localStorage.setItem('hul-os-wallpaper', next.toString());
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden text-slate-200 select-none">
      <MenuBar onCycleWallpaper={cycleWallpaper} />
      
      <div className={`flex-1 relative overflow-hidden ${WALLPAPERS[wallpaperIndex]}`}>
        {/* Desktop Icons */}
        <div className="absolute inset-0 p-8 grid grid-cols-6 gap-6 content-start z-0">
          {APPS.map(app => (
            <button
              key={app.id}
              className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-white/10 transition-colors group focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              onDoubleClick={() => openWindow(app.id, app.title, app.defaultSize)}
              title={app.title}
            >
              <div className="w-16 h-16 flex items-center justify-center bg-slate-900/60 border border-slate-700/50 rounded-2xl group-hover:scale-105 group-hover:border-indigo-500/50 transition-all shadow-lg backdrop-blur-sm">
                {(() => { const AppIcon = getAppIcon(app.icon); return <AppIcon className="w-8 h-8 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />; })()}
              </div>
              <span className="text-xs font-medium text-slate-300 drop-shadow-md text-center leading-tight line-clamp-2">
                {app.title}
              </span>
            </button>
          ))}
        </div>

        {/* System Status Widget */}
        <div className="absolute bottom-8 right-8 w-64 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 shadow-2xl z-0 font-mono">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700/50">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 tracking-wider">SYSTEM OPERATIONAL</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Server className="w-3.5 h-3.5" />
                <span className="text-xs">Active Nodes</span>
              </div>
              <span className="text-sm font-semibold text-white">{stats.nodes.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <GitMerge className="w-3.5 h-3.5" />
                <span className="text-xs">Network Lanes</span>
              </div>
              <span className="text-sm font-semibold text-white">{stats.lanes.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Box className="w-3.5 h-3.5" />
                <span className="text-xs">Managed SKUs</span>
              </div>
              <span className="text-sm font-semibold text-white">{stats.skus.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Windows Area */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {Object.values(windows || {}).map(win => {
            const app = APPS.find(a => a.id === win.appId);
            if (!app || win.isMinimized) return null;
            
            const AppComp = app.component;
            return (
              <Window
                key={win.id}
                window={win}
                onClose={() => closeWindow(win.id)}
                onMinimize={() => minimizeWindow(win.id)}
                onMaximize={() => toggleMaximize(win.id)}
                onFocus={() => bringToFront(win.id)}
              >
                <AppComp />
              </Window>
            );
          })}
        </div>
      </div>

      <BottomBar 
        windows={windows} 
        onWindowClick={(id) => {
          const win = windows.find(w => w.id === id);
          if (win?.isMinimized) {
            bringToFront(id);
          } else if (win?.isFocused) {
            minimizeWindow(id);
          } else {
            bringToFront(id);
          }
        }}
      />
    </div>
  );
}
