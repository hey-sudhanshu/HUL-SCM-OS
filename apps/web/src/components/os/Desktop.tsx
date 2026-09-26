'use client';
import { useEffect, useState } from 'react';
import { useOSStore } from '@/lib/store/os';
import { Window } from './Window';
import { PixelIcon } from './Icon';
import { MenuBar } from './MenuBar';
import { BottomBar } from './BottomBar';
import { NetworkBrowser } from './apps/NetworkBrowser';
import { RouteOptimizer } from './apps/RouteOptimizer';
import { TacticalMap } from './apps/TacticalMap';
import { WarehouseManager } from './apps/WarehouseManager';
import { DispatchManager } from './apps/DispatchManager';
import { InventoryLab } from './apps/InventoryLab';
import { Orion } from './apps/Orion';
import { Governance } from './apps/Governance';
import { FreightCalculator } from './apps/FreightCalc';
import { VendorManager } from './apps/VendorManager';
import { RiskSimulator } from './apps/RiskSimulator';

const APPS = [
  { id: 'network', title: 'Network Browser', icon: 'database', component: NetworkBrowser },
  { id: 'tactical', title: 'Tactical Map', icon: 'map', component: TacticalMap },
  { id: 'warehouse', title: 'Warehouse Manager', icon: 'box', component: WarehouseManager },
  { id: 'dispatch', title: 'Dispatch Manager', icon: 'truck', component: DispatchManager },
  { id: 'route', title: 'Route Optimizer', icon: 'map', component: RouteOptimizer },
  { id: 'freight', title: 'Freight Calculator', icon: 'calculator', component: FreightCalculator },
  { id: 'inventory', title: 'Inventory Lab', icon: 'archive', component: InventoryLab },
  { id: 'vendor', title: 'Vendor Manager', icon: 'users', component: VendorManager },
  { id: 'risk', title: 'Risk Simulator', icon: 'alert', component: RiskSimulator },
  { id: 'governance', title: 'Governance', icon: 'shield', component: Governance },
  { id: 'orion', title: 'Orion Orchestrator', icon: 'terminal', component: Orion },
];

export function Desktop() {
  const [mounted, setMounted] = useState(false);
  const windows = useOSStore(state => state.windows);
  const openWindow = useOSStore(state => state.openWindow);
  
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#eef1f4] flex flex-col font-sans select-none text-sys-black">
      <MenuBar />
      
      <div className="flex-1 relative w-full h-full p-4 overflow-hidden" 
           style={{
             backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
             backgroundSize: '24px 24px'
           }}
      >
        <div className="flex flex-col flex-wrap content-start h-full gap-4 pt-2 pl-2">
          {APPS.map(app => (
            <div 
              key={app.id} 
              onDoubleClick={() => openWindow(app.id, app.title)}
              className="w-24 h-24 flex flex-col items-center justify-center gap-2 rounded-lg cursor-pointer transition-all hover:bg-black/5 active:bg-black/10 group"
            >
              <div className="w-12 h-12 bg-white shadow-sm border border-gray-200 rounded-xl flex items-center justify-center group-hover:shadow-md transition-all group-hover:scale-105 group-active:scale-95 text-[var(--sys-teal)]">
                <PixelIcon type={app.icon as any} className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-center leading-tight px-1 text-gray-700 bg-white/50 backdrop-blur rounded px-1.5 py-0.5 shadow-sm">
                {app.title}
              </span>
            </div>
          ))}
        </div>

        {Object.entries(windows).map(([id, win]) => {
          const app = APPS.find(a => a.id === id);
          if (!app) return null;
          const AppComp = app.component;
          return (
            <Window key={id} id={id}>
              <AppComp />
            </Window>
          );
        })}
      </div>

      <BottomBar />
    </div>
  );
}
