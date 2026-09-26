'use client';
import { useOSStore } from '@/lib/store/os';
import { Window } from './Window';
import { MenuBar } from './MenuBar';
import { BottomBar } from './BottomBar';
import { ScmDeskWidget } from './ScmDeskWidget';
import { PixelIcon } from './Icon';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { fetchNetworkData } from '@/lib/api';
import { NetworkBrowser } from './apps/NetworkBrowser';
import { WarehouseManager } from './apps/WarehouseManager';
import { FreightCalc } from './apps/FreightCalc';
import { RouteOptimizer } from './apps/RouteOptimizer';
import { DispatchManager } from './apps/DispatchManager';
import { TacticalMap } from './apps/TacticalMap';

import { InventoryLab } from './apps/InventoryLab';
import { Governance } from '../Governance';
import { RiskSimulator } from './apps/RiskSimulator';
import { CopilotApp } from './apps/Copilot';
import { VendorManager } from './apps/VendorManager';


const APPS: Record<string, { title: string; component: React.FC }> = {
  'network-browser': { title: 'Network Browser', component: NetworkBrowser },
  'warehouse-manager': { title: 'Warehouse Manager', component: WarehouseManager },
  'freight-calc': { title: 'Freight Calculator', component: FreightCalc },
  'route-opt': { title: 'Route Optimizer', component: RouteOptimizer },
  'dispatch-manager': { title: 'Dispatch Manager', component: DispatchManager },
  'tactical-map': { title: 'Tactical Map', component: TacticalMap },
  'inventory-lab': { title: 'Inventory Lab', component: InventoryLab },
  'vendor-manager': { title: 'Vendor Manager', component: VendorManager },
  'governance': { title: 'Governance', component: Governance },
  'risk-simulator': { title: 'Risk Simulator', component: RiskSimulator },
  'copilot': { title: 'Orion Orchestrator', component: CopilotApp },
};

const ICONS = [
  { id: 'network-browser', title: 'Network', icon: 'folder' },
  { id: 'warehouse-manager', title: 'Warehouse', icon: 'app' },
  { id: 'freight-calc', title: 'Freight', icon: 'app' },
  { id: 'route-opt', title: 'Routing', icon: 'app' },
  { id: 'tactical-map', title: 'Tactical Map', icon: 'app' },
  { id: 'dispatch-manager', title: 'Dispatch', icon: 'app' },
  { id: 'inventory-lab', title: 'Inventory', icon: 'app' },
  { id: 'vendor-manager', title: 'Vendors', icon: 'app' },
  { id: 'governance', title: 'Governance', icon: 'app' },
  { id: 'risk-simulator', title: 'Risk Sim', icon: 'app' },
];

export function Desktop() {
  const windows = useOSStore(state => state.windows);
  const openWindow = useOSStore(state => state.openWindow);
  const focusWindow = useOSStore(state => state.focusWindow);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    fetchNetworkData().then(data => {
      console.log("Network data loaded. Warehouses:", data.warehouses?.length);
      setDataLoaded(true);
    });

    if (Object.keys(useOSStore.getState().windows).length === 0) {
      setTimeout(() => {
        useOSStore.getState().openWindow('route-opt', 'Route Optimizer', { width: 1000, height: 700 });
      }, 500);
    }
  }, [openWindow, focusWindow]);

  const handleIconDoubleClick = (id: string, title: string) => {
    openWindow(id, title);
    setSelectedIcon(null);
  };

  return (
    <div 
      className="w-full h-full relative overflow-hidden flex flex-col font-sans text-sys-black"
    >
      <div className="absolute inset-0 z-0 opacity-5">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="network-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="2" fill="var(--sys-teal)" />
              <circle cx="80" cy="40" r="3" fill="var(--sys-amber)" />
              <circle cx="50" cy="80" r="2" fill="var(--sys-teal)" />
              <line x1="20" y1="20" x2="80" y2="40" stroke="var(--sys-teal)" strokeWidth="0.5" strokeDasharray="2,2" />
              <line x1="80" y1="40" x2="50" y2="80" stroke="var(--sys-teal)" strokeWidth="0.5" strokeDasharray="2,2" />
              <line x1="50" y1="80" x2="20" y2="20" stroke="var(--sys-teal)" strokeWidth="0.5" strokeDasharray="2,2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#network-pattern)" />
        </svg>
      </div>

      <MenuBar />
      
      {/* Desktop Area */}
      <div 
        className="flex-1 relative w-full h-full p-6 flex flex-col gap-6 flex-wrap content-start pb-12 pt-12 z-10"
        onClick={() => setSelectedIcon(null)}
      >
        {ICONS.map((icon) => (
          <div 
            key={icon.id}
            className="flex flex-col items-center w-24 gap-2 group cursor-pointer desktop-icon"
            onClick={(e) => { e.stopPropagation(); setSelectedIcon(icon.id); }}
            onDoubleClick={() => handleIconDoubleClick(icon.id, icon.title)}
          >
            <div className={clsx(
              "w-10 h-10 flex items-center justify-center bg-white/80 rounded-lg shadow-sm border border-black/10 transition-all group-hover:scale-105 group-hover:shadow-md",
              selectedIcon === icon.id ? "ring-2 ring-[var(--sys-amber)] bg-[var(--sys-teal)]" : ""
            )}>
              <PixelIcon type={icon.icon} className={clsx("w-6 h-6", selectedIcon === icon.id ? "text-white" : "text-[var(--sys-teal)]")} />
            </div>
            <div className={clsx(
              "desktop-icon-label transition-colors",
              selectedIcon === icon.id ? "bg-[var(--sys-amber)] text-[var(--sys-black)] border-black" : ""
            )}>
              {icon.title}
            </div>
          </div>
        ))}

        <ScmDeskWidget />

        {Object.entries(windows).map(([id, win]) => {
          const AppConfig = APPS[id];
          if (!AppConfig) return null;
          const AppComponent = AppConfig.component;
          
          return (
            <Window key={id} id={id} title={win.title} initialWidth={win.size.width} initialHeight={win.size.height}>
              <AppComponent />
            </Window>
          );
        })}
      </div>

      <BottomBar />
    </div>
  );
}
