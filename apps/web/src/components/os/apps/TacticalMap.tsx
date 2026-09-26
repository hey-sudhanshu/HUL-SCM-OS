'use client';
import { useEffect, useState } from 'react';
import { fetchNetworkData } from '@/lib/api';
import { SCMMap } from '../../map/SCMMap';
import { MapIcon, Filter } from 'lucide-react';
import { formatNumber } from '@/lib/format';

export function TacticalMap() {
  const [data, setData] = useState<any>(null);
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    plants: true,
    warehouses: true,
    cfas: true,
    lanes: false,
  });

  useEffect(() => {
    fetchNetworkData().then(setData);
  }, []);

  if (!data) return <div className="p-8 text-sm font-mono text-gray-500">Loading Tactical Map...</div>;

  let visibleNodes: any[] = [];
  if (activeLayers.plants) visibleNodes = [...visibleNodes, ...(data.plants || [])];
  if (activeLayers.warehouses) visibleNodes = [...visibleNodes, ...(data.warehouses || [])];
  if (activeLayers.cfas) visibleNodes = [...visibleNodes, ...(data.cfas || [])];

  let visibleRoutes: any[] = [];
  // For Tactical Map, we only show some routes if lanes are toggled on (to prevent visual overload)
  if (activeLayers.lanes && data.lanes) {
    visibleRoutes = data.lanes.slice(0, 100).map((l: any) => {
      const orig = visibleNodes.find(n => n.id === l.origin);
      const dest = visibleNodes.find(n => n.id === l.destination);
      if (orig && dest) {
        return {
          id: l.id || `${l.origin}-${l.destination}`,
          color: 'var(--sys-teal)',
          coordinates: [[orig.lon || orig.longitude, orig.lat || orig.latitude], [dest.lon || dest.longitude, dest.lat || dest.latitude]]
        };
      }
      return null;
    }).filter(Boolean);
  }

  return (
    <div className="scm-app-layout">
      <div className="scm-header">
        <div className="scm-header-title">
          <MapIcon className="w-4 h-4 text-blue-600" />
          TACTICAL MAP
        </div>
      </div>
      
      <div className="scm-main flex-row-reverse">
        <div className="scm-panel w-64 bg-gray-50 border-l border-gray-200">
          <div className="scm-panel-header flex justify-between">
            <span>Layers</span>
            <Filter className="w-3 h-3" />
          </div>
          <div className="scm-panel-content space-y-4">
            <div className="space-y-2">
              {Object.entries(activeLayers).map(([key, isActive]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-100 rounded">
                  <input 
                    type="checkbox" 
                    checked={isActive}
                    onChange={(e) => setActiveLayers(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="rounded border-gray-300 text-[var(--sys-teal)] focus:ring-[var(--sys-teal)]"
                  />
                  <span className="text-xs font-semibold capitalize text-gray-700">{key}</span>
                  {key !== 'lanes' && (
                    <span className="ml-auto text-[10px] font-mono bg-white px-1 border border-gray-200 rounded text-gray-500">
                      {formatNumber(data[key]?.length || 0)}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex-1 relative">
          <SCMMap 
            nodes={visibleNodes}
            routes={visibleRoutes}
          />
        </div>
      </div>
    </div>
  );
}
