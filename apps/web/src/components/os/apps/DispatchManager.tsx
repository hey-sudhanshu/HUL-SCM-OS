'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Send, Package, Truck, ChevronRight } from 'lucide-react';
import { fetchNetworkData } from '@/lib/api';
import { formatNumber, formatPercent } from '@/lib/format';
import SCMMap from '@/components/map/SCMMap';

export default function DispatchManager() {
  const [network, setNetwork] = useState<any>(null);
  const [phase4a, setPhase4a] = useState<any>(null);
  const [phase4b, setPhase4b] = useState<any>(null);
  
  useEffect(() => {
    fetchNetworkData().then(setNetwork);
    fetch('/precomputed/phase4a.json')
      .then(res => res.json())
      .then(setPhase4a)
      .catch(console.error);
    fetch('/precomputed/phase4b.json')
      .then(res => res.json())
      .then(setPhase4b)
      .catch(console.error);
  }, []);

  const cvrpRoutes = useMemo(() => {
    return phase4a?.cvrp_nagpur?.routes || [];
  }, [phase4a]);

  const bins = useMemo(() => {
    return phase4a?.bin_packing_demo?.bins || [];
  }, [phase4a]);

  const mapData = useMemo(() => {
    if (!network || cvrpRoutes.length === 0) return { markers: [], layers: [] };

    const nodeMap = new Map();
    [...(network.plants || []), ...(network.warehouses || []), ...(network.distributors || [])].forEach(n => {
      nodeMap.set(n.id, n);
    });

    const markers: any[] = [];
    const layers: any[] = [];

    // Depot
    const depotNode = nodeMap.get('WH-NAG');
    if (depotNode) {
      markers.push({
        id: 'WH-NAG',
        coordinates: depotNode.coordinates,
        color: '#ef4444',
        label: 'DEPOT (WH-NAG)'
      });
    }

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

    cvrpRoutes.forEach((r: any, index: number) => {
      const color = colors[index % colors.length];
      const coordinates = r.route.map((nodeId: string) => {
        const node = nodeMap.get(nodeId);
        if (node && nodeId !== 'WH-NAG') {
          markers.push({
            id: `node-${nodeId}-${index}`,
            coordinates: node.coordinates,
            color: color,
            label: nodeId
          });
        }
        return node ? node.coordinates : null;
      }).filter(Boolean);

      if (coordinates.length > 1) {
        layers.push({
          id: `cvrp-route-${index}`,
          type: 'line',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates
            }
          },
          paint: {
            'line-color': color,
            'line-width': 3,
            'line-opacity': 0.8
          }
        });
      }
    });

    return { markers, layers };
  }, [network, cvrpRoutes]);

  if (!network || !phase4a) return <div className="p-8 text-slate-400 font-mono">Loading dispatch data...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-slate-800 bg-slate-950">
        <Send className="w-5 h-5 text-blue-400 mr-3" />
        <h1 className="text-lg font-bold text-slate-100 tracking-wider">DISPATCH MANAGER</h1>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-slate-800 bg-slate-950/50">
        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <div className="text-slate-500 text-xs mb-1">TOTAL ROUTES</div>
          <div className="text-xl font-bold text-slate-100">
            {formatNumber(cvrpRoutes.length)}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <div className="text-slate-500 text-xs mb-1">TOTAL BINS</div>
          <div className="text-xl font-bold text-slate-100">
            {formatNumber(phase4a?.bin_packing_demo?.total_bins || 0)}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <div className="text-slate-500 text-xs mb-1">FLEET VEHICLES</div>
          <div className="text-xl font-bold text-slate-100">
            {formatNumber(cvrpRoutes.length)}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <div className="text-slate-500 text-xs mb-1">DISPATCH STATUS</div>
          <div className="text-xl font-bold text-emerald-400">
            READY
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Routes & Bins */}
        <div className="w-1/2 border-r border-slate-800 overflow-y-auto bg-slate-900 p-4 space-y-6">
          
          {/* CVRP Routes */}
          <div>
            <h2 className="text-slate-300 font-bold mb-4 flex items-center">
              <Truck className="w-4 h-4 mr-2 text-slate-400" />
              CVRP Routes (Nagpur)
            </h2>
            <div className="space-y-3">
              {cvrpRoutes.map((r: any, idx: number) => (
                <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-blue-400">Vehicle {idx + 1} ({r.vehicle})</span>
                    <span className="text-slate-400 text-sm">{formatNumber(r.distance || 0)} km</span>
                  </div>
                  <div className="text-xs text-slate-300 flex flex-wrap items-center gap-1">
                    {r.route.map((node: string, i: number) => (
                      <React.Fragment key={i}>
                        <span className={node === 'WH-NAG' ? 'text-amber-400 font-bold' : ''}>
                          {node}
                        </span>
                        {i < r.route.length - 1 && <ChevronRight className="w-3 h-3 text-slate-600" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bin Packing */}
          <div>
            <h2 className="text-slate-300 font-bold mb-4 flex items-center">
              <Package className="w-4 h-4 mr-2 text-slate-400" />
              Bin Packing Demo
            </h2>
            <div className="space-y-3">
              {bins.map((bin: any, idx: number) => {
                // assume max capacity is somewhat relative to current weight/vol to show a bar, or hardcode a reasonable max
                const maxW = 2000;
                const maxV = 15;
                const wPct = Math.min((bin.weight / maxW) * 100, 100);
                const vPct = Math.min((bin.volume / maxV) * 100, 100);

                return (
                  <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-slate-200">Bin {bin.id}</span>
                      <span className="text-slate-400 text-sm">{bin.items?.length || 0} items</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>Weight Util</span>
                          <span>{formatNumber(bin.weight)} kg</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${wPct}%` }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>Volume Util</span>
                          <span>{formatNumber(bin.volume)} m³</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${vPct}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Panel - Map */}
        <div className="flex-1 relative">
          <SCMMap
            markers={mapData.markers}
            layers={mapData.layers}
            center={mapData.markers.find(m => m.id === 'WH-NAG')?.coordinates || [79.0882, 21.1458]}
            zoom={6}
          />
        </div>
      </div>
    </div>
  );
}
