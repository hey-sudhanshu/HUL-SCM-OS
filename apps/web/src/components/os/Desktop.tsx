"use client";

import React, { useState, useEffect } from 'react';
import NetworkBrowser from './apps/NetworkBrowser';
import TacticalMap from './apps/TacticalMap';
import WarehouseManager from './apps/WarehouseManager';
import DispatchManager from './apps/DispatchManager';
import RouteOptimizer from './apps/RouteOptimizer';
import FreightCalculator from './apps/FreightCalc';
import InventoryLab from './apps/InventoryLab';
import VendorManager from './apps/VendorManager';
import RiskSimulator from './apps/RiskSimulator';
import { Governance } from '../Governance';
import { Orion } from './apps/Copilot';
import { Activity, Server, Box, GitMerge, LayoutGrid, Network, Map, Truck, Shield, Route, Package, Database, AlertTriangle, Scale, Cpu, Search, MapPin } from 'lucide-react';

type AppDefinition = {
  id: string;
  title: string;
  icon: string;
  component: React.ComponentType<any>;
};

const APPS: AppDefinition[] = [
  { id: 'tactical', title: 'Tactical Map', icon: 'tactical', component: TacticalMap },
  { id: 'network', title: 'Network Browser', icon: 'network', component: NetworkBrowser },
  { id: 'warehouse', title: 'Warehouse Manager', icon: 'warehouse', component: WarehouseManager },
  { id: 'dispatch', title: 'Dispatch Manager', icon: 'dispatch', component: DispatchManager },
  { id: 'route', title: 'Route Optimizer', icon: 'route', component: RouteOptimizer },
  { id: 'freight', title: 'Freight Calculator', icon: 'freight', component: FreightCalculator },
  { id: 'inventory', title: 'Inventory Lab', icon: 'inventory', component: InventoryLab },
  { id: 'vendor', title: 'Supply Base', icon: 'vendor', component: VendorManager },
  { id: 'risk', title: 'Risk Simulator', icon: 'risk', component: RiskSimulator },
  { id: 'governance', title: 'Governance', icon: 'governance', component: Governance },
  { id: 'orion', title: 'Orion', icon: 'orion', component: Orion }
];

const getAppIcon = (iconName: string) => {
  switch (iconName) {
    case 'network': return Network;
    case 'tactical': return MapPin;
    case 'warehouse': return Box;
    case 'dispatch': return Truck;
    case 'route': return Route;
    case 'freight': return Package;
    case 'inventory': return Database;
    case 'vendor': return Shield;
    case 'risk': return AlertTriangle;
    case 'governance': return Scale;
    case 'orion': return Cpu;
    default: return LayoutGrid;
  }
};

export function Desktop() {
  const [activeApp, setActiveApp] = useState('tactical');
  const AppComp = APPS.find(a => a.id === activeApp)?.component || TacticalMap;

  return (
    <div className="flex h-screen bg-black text-slate-200 overflow-hidden font-mono select-none">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col z-20 shadow-2xl relative">
        <div className="p-5 border-b border-zinc-800 flex items-center gap-3 bg-zinc-900/50">
           <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] text-black flex items-center justify-center font-bold text-lg tracking-tighter border border-emerald-400/50">
             HUL
           </div>
           <div>
             <div className="font-bold tracking-widest text-sm text-zinc-100">SCM OS</div>
             <div className="text-[10px] text-emerald-400 font-semibold tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                CONTROL TOWER
             </div>
           </div>
        </div>
        <div className="flex-1 overflow-y-auto py-3 custom-scrollbar">
          {APPS.map(app => {
            const isActive = activeApp === app.id;
            return (
              <button 
                key={app.id} 
                onClick={() => setActiveApp(app.id)}
                className={`w-full flex items-center gap-3 px-6 py-3.5 text-sm transition-all duration-200 ${isActive ? 'bg-zinc-800/80 text-white border-l-2 border-emerald-500 shadow-inner' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'}`}
              >
                {(() => { 
                  const AppIcon = getAppIcon(app.icon); 
                  return <AppIcon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />; 
                })()}
                <span className="font-medium tracking-wide text-xs">{app.title.toUpperCase()}</span>
              </button>
            )
          })}
        </div>
        <div className="p-4 border-t border-zinc-800 text-[10px] text-zinc-600 flex flex-col gap-1">
          <div>Hindustan Unilever Limited</div>
          <div>SCM OS v2.0.4 (Build 8492)</div>
          <div className="text-emerald-500/70 mt-1">SECURE CONNECTION</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative bg-zinc-900">
        {/* Top Navbar */}
        <div className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center px-6 justify-between shrink-0 z-10 shadow-md">
           <div className="font-semibold text-zinc-200 tracking-widest text-sm flex items-center gap-3">
             {(() => { 
                const AppIcon = getAppIcon(APPS.find(a => a.id === activeApp)?.icon || 'layout'); 
                return <AppIcon className="w-5 h-5 text-emerald-500" />; 
             })()}
             {APPS.find(a => a.id === activeApp)?.title.toUpperCase()}
           </div>
           <div className="flex items-center gap-6 text-xs font-semibold text-zinc-500 tracking-wider">
             <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-md border border-zinc-800">
               <Server className="w-3.5 h-3.5 text-blue-400" />
               SYSTEM ACTIVE
             </div>
             <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-md border border-zinc-800">
               <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span> 
               ORION ONLINE
             </div>
           </div>
        </div>

        {/* Application Render Space */}
        <div className="flex-1 relative overflow-hidden">
           <AppComp />
        </div>
      </div>
    </div>
  )
}
