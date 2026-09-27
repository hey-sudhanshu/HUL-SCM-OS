'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Route, MapPin, ChevronRight, Info } from 'lucide-react';
import { fetchNetworkData } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/format';
import SCMMap from '@/components/map/SCMMap';

export default function RouteOptimizer() {
  const [network, setNetwork] = useState<any>(null);
  const [phase4a, setPhase4a] = useState<any>(null);
  const [origin, setOrigin] = useState<string>('PL-HAL');
  const [destination, setDestination] = useState<string>('WH-PUN');
  const [optimized, setOptimized] = useState(false);
  const [selectedPathIndex, setSelectedPathIndex] = useState(0);

  useEffect(() => {
    fetchNetworkData().then(setNetwork);
    fetch('/precomputed/phase4a.json')
      .then((res) => res.json())
      .then(setPhase4a)
      .catch(console.error);
  }, []);

  const handleOptimize = () => {
    setOptimized(true);
    setSelectedPathIndex(0);
  };

  const currentPaths = useMemo(() => {
    if (!optimized || !phase4a?.k_shortest) return [];
    const key = `${origin}_${destination}`;
    return phase4a.k_shortest[key]?.paths || [];
  }, [optimized, phase4a, origin, destination]);

  const mapData = useMemo(() => {
    if (!network || currentPaths.length === 0) return { markers: [], layers: [] };

    const nodeMap = new Map();
    [...(network.plants || []), ...(network.warehouses || []), ...(network.distributors || [])].forEach(n => {
      nodeMap.set(n.id, n);
    });

    const markers: any[] = [];
    const layers: any[] = [];

    // Draw lines for all paths
    currentPaths.forEach((path: any, index: number) => {
      const isSelected = index === selectedPathIndex;
      const coordinates = path.path.map((nodeId: string) => {
        const node = nodeMap.get(nodeId);
        return node ? node.coordinates : null;
      }).filter(Boolean);

      if (coordinates.length > 1) {
        layers.push({
          id: `route-${index}`,
          type: 'line',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates
            }
          },
          paint: {
            'line-color': isSelected ? '#10b981' : '#6b7280',
            'line-width': isSelected ? 4 : 2,
            'line-opacity': isSelected ? 1 : 0.5
          }
        });
      }
    });

    // Add origin and destination markers
    const originNode = nodeMap.get(origin);
    const destNode = nodeMap.get(destination);
    
    if (originNode) {
      markers.push({
        id: 'origin',
        coordinates: originNode.coordinates,
        color: '#3b82f6',
        label: origin
      });
    }
    
    if (destNode) {
      markers.push({
        id: 'destination',
        coordinates: destNode.coordinates,
        color: '#ef4444',
        label: destination
      });
    }

    return { markers, layers };
  }, [network, currentPaths, selectedPathIndex, origin, destination]);

  if (!network) return <div className="p-8 text-slate-400 font-mono">Loading data...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 font-mono">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-slate-800 bg-slate-950">
        <Route className="w-5 h-5 text-blue-400 mr-3" />
        <h1 className="text-lg font-bold text-slate-100 tracking-wider">ROUTE OPTIMIZER</h1>
      </div>

      {/* Toolbar */}
      <div className="flex items-center p-4 gap-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">ORIGIN:</span>
          <select 
            className="bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1 rounded text-sm focus:outline-none focus:border-blue-500"
            value={origin}
            onChange={(e) => { setOrigin(e.target.value); setOptimized(false); }}
          >
            {(network.plants || []).map((p: any) => (
              <option key={p.id} value={p.id}>{p.id} ({p.name})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">DEST:</span>
          <select 
            className="bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1 rounded text-sm focus:outline-none focus:border-blue-500"
            value={destination}
            onChange={(e) => { setDestination(e.target.value); setOptimized(false); }}
          >
            {(network.warehouses || []).map((w: any) => (
              <option key={w.id} value={w.id}>{w.id} ({w.name})</option>
            ))}
          </select>
        </div>

        <button 
          onClick={handleOptimize}
          className="ml-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-1 rounded text-sm font-bold transition-colors"
        >
          OPTIMIZE
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="w-1/3 border-r border-slate-800 overflow-y-auto bg-slate-900">
          {!optimized ? (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center">
              <MapPin className="w-12 h-12 mb-4 opacity-50" />
              <p>Select origin and destination, then click Optimize</p>
            </div>
          ) : currentPaths.length === 0 ? (
            <div className="p-8 text-center text-amber-500 flex flex-col items-center">
              <Info className="w-12 h-12 mb-4 opacity-50" />
              <p>No precomputed routes for this pair</p>
              <p className="text-sm opacity-70 mt-2">({origin}_{destination})</p>
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-4">
              {currentPaths.map((path: any, index: number) => {
                const isSelected = index === selectedPathIndex;
                const isOptimal = index === 0;
                return (
                  <div 
                    key={index}
                    onClick={() => setSelectedPathIndex(index)}
                    className={`cursor-pointer rounded border p-4 transition-colors ${
                      isSelected ? 'border-blue-500 bg-blue-900/20' : 'border-slate-800 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-slate-200">Route Option {index + 1}</h3>
                      {isOptimal && (
                        <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded font-bold">
                          OPTIMAL
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                      <div>
                        <div className="text-slate-500 text-xs">COST</div>
                        <div className="text-slate-200 font-bold">{formatCurrency(path.total_cost || 0)}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs">DISTANCE</div>
                        <div className="text-slate-200">{formatNumber(path.total_distance || 0)} km</div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs">TIME</div>
                        <div className="text-slate-200">{formatNumber(path.total_time || 0)} hrs</div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-slate-400 break-words flex flex-wrap items-center gap-1">
                      {path.path.map((node: string, i: number) => (
                        <React.Fragment key={i}>
                          <span className={i === 0 || i === path.path.length - 1 ? 'text-slate-200 font-bold' : ''}>
                            {node}
                          </span>
                          {i < path.path.length - 1 && <ChevronRight className="w-3 h-3 text-slate-600" />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex-1 relative">
          <SCMMap
            markers={mapData.markers}
            layers={mapData.layers}
            center={mapData.markers.length > 0 ? mapData.markers[0].coordinates : undefined}
            zoom={mapData.markers.length > 0 ? 5 : undefined}
          />
        </div>
      </div>
    </div>
  );
}
