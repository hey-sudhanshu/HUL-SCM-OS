import React, { useState, useEffect } from 'react';
import { fetchNetworkData } from '@/lib/api';
import { Marker, Source, Layer } from 'react-map-gl/maplibre';
import { SCMMap } from '../../ui/SCMMap';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '@/store';

function GanttChart({ routes }: { routes: any[] }) {
  const { selectedTruckId, setSelectedTruckId } = useMapStore();
  if (!routes || routes.length === 0) return <div>No routes found.</div>;
  
  let maxTime = 1;
  routes.forEach(r => {
    r.schedule.forEach((s: any) => {
      if (s.departure_time > maxTime) maxTime = s.departure_time;
    });
  });

  return (
    <div className="flex flex-col gap-2 mt-2 w-full text-[10px]">
      {routes.map((r, idx) => {
        const isSelected = selectedTruckId === idx;
        return (
          <div 
            key={idx} 
            className={`flex flex-col border p-1 cursor-pointer transition-colors ${isSelected ? 'bg-yellow-100 border-yellow-800' : 'bg-white border-sys-black'}`}
            onClick={() => setSelectedTruckId(isSelected ? null : idx)}
          >
            <div className="font-bold flex justify-between">
              <span>Vehicle {idx + 1} ({idx === 0 ? 'HCV 16T' : 'ICV 9T'})</span>
              <span>{r.schedule[r.schedule.length-1].arrival_time} hrs</span>
            </div>
            <div className="relative h-6 bg-gray-200 w-full mt-1 border border-sys-black overflow-hidden">
              {r.schedule.map((s: any, i: number) => {
                if (i === r.schedule.length - 1) return null;
                const next = r.schedule[i + 1];
                const left = (s.departure_time / maxTime) * 100;
                const width = ((next.arrival_time - s.departure_time) / maxTime) * 100;
                const isWait = next.arrival_time > s.departure_time + 1;
                return (
                  <div 
                    key={i} 
                    className={`absolute h-full border-r border-sys-black flex items-center justify-center text-[8px] text-white ${isWait ? 'bg-orange-400' : 'bg-blue-600'}`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${s.loc} -> ${next.loc}`}
                  >
                    <span className="truncate px-1">{i+1}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-8">Load:</span>
              <div className="flex-1 h-3 bg-gray-200 border border-sys-black">
                <div className="h-full bg-green-500" style={{ width: `${80 - idx * 10}%` }}></div>
              </div>
              <span>{80 - idx * 10}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SchematicMap({ network, dispatchData }: { network: any, dispatchData: any }) {
  const { selectedTruckId, hoveredNodeId, setHoveredNodeId } = useMapStore();
  
  if (!network) return null;
  // A basic topological SVG rendering for the metro-style tactical map
  // Nodes scaled by throughput mock
  const nodes = dispatchData?.routes?.flatMap((r:any) => r.schedule.map((s:any) => s.loc)) || [];
  const uniqueNodes = Array.from(new Set(nodes));
  
  const getPos = (idx: number, total: number) => {
    const angle = (idx / total) * 2 * Math.PI;
    return { x: 150 + Math.cos(angle) * 100, y: 120 + Math.sin(angle) * 80 };
  };

  return (
    <svg width="100%" height="100%" viewBox="0 0 300 240" className="bg-gray-50 border border-sys-black">
      {/* Draw edges */}
      {dispatchData?.routes?.map((r: any, vIdx: number) => {
        if (selectedTruckId !== null && selectedTruckId !== vIdx) return null;
        return r.schedule.map((s: any, i: number) => {
          if (i === r.schedule.length - 1) return null;
          const next = r.schedule[i+1];
          const n1Idx = uniqueNodes.indexOf(s.loc);
          const n2Idx = uniqueNodes.indexOf(next.loc);
          const p1 = getPos(n1Idx, uniqueNodes.length);
          const p2 = getPos(n2Idx, uniqueNodes.length);
          return (
            <line key={`${vIdx}-${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={vIdx===0?"#1B998B":"#E3352F"} strokeWidth="4" className="opacity-80" />
          );
        });
      })}
      {/* Draw nodes */}
      {uniqueNodes.map((nId: any, i: number) => {
        const p = getPos(i, uniqueNodes.length);
        const isHovered = hoveredNodeId === nId;
        const isDepot = nId === "WH-NAG";
        return (
          <g 
            key={nId} 
            transform={`translate(${p.x},${p.y})`}
            onMouseEnter={() => setHoveredNodeId(nId)}
            onMouseLeave={() => setHoveredNodeId(null)}
            className="cursor-pointer"
          >
            <circle r={isDepot ? 14 : 8} fill={isDepot ? "#000" : (isHovered ? "#FBBF24" : "#fff")} stroke="#000" strokeWidth="2" />
            <text y={isDepot ? 25 : 20} textAnchor="middle" fontSize="10" fontWeight="bold">{nId}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function DispatchManager() {
  const [network, setNetwork] = useState<any>(null);
  const [phase4b, setPhase4b] = useState<any>(null);
  const { selectedTruckId, setSelectedTruckId, hoveredNodeId, setHoveredNodeId, sourceState } = useMapStore();
  

  useEffect(() => {
    fetchNetworkData().then(setNetwork);
    fetch('/precomputed/phase4b.json')
      .then(r => r.json())
      .then(setPhase4b)
      .catch(console.error);
  }, []);

  if (!network || !phase4b) return <div className="p-4 font-mono text-xs">Loading Phase 4b...</div>;

  const dispatchData = phase4b?.dispatch_nagpur;
  
  const buildFeatures = () => {
    if (!dispatchData || !dispatchData.routes) return { type: 'FeatureCollection', features: [] };
    const features: any[] = [];
    const colors = ['#E3352F', '#1B998B', '#C29A2E'];
    
    dispatchData.routes.forEach((r: any, idx: number) => {
      if (selectedTruckId !== null && selectedTruckId !== idx) return; // Filter
      const coords = r.schedule.map((s: any) => {
        const n = [...network.warehouses, ...network.distributors, ...network.plants].find(n => n.id === s.loc);
        return [n?.coordinates[1] || 0, n?.coordinates[0] || 0];
      });
      features.push({
        type: 'Feature',
        properties: { color: colors[idx % colors.length] },
        geometry: { type: 'LineString', coordinates: coords }
      });
    });
    return { type: 'FeatureCollection', features } as any;
  };

  const lineLayer = {
    id: 'dispatch-lines',
    type: 'line',
    source: 'routes',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 4
    }
  } as any;

  return (
    <div className="flex flex-col h-full bg-sys-gray font-mono text-xs overflow-y-auto">
      <div className="bg-sys-white border-b-2 border-sys-black p-2 flex justify-between items-center">
        <div className="font-bold">Dispatch Manager (Phase 4b) - Route & Load Optimization</div>
        
      </div>

      <div className="p-4 grid grid-cols-2 gap-4">
        {/* Map Views */}
        <div className="col-span-1 border-2 border-sys-black bg-white shadow-[2px_2px_0px_#000] p-2 flex flex-col h-96 relative">
          <div className="font-bold mb-2">Geographic Dispatch Map</div>
          {(
            <div className="flex-1 border border-sys-black relative overflow-hidden">
              <SCMMap
                initialViewState={{ longitude: 79.0, latitude: 21.1, zoom: 5 }}
              >
                <Source id="routes" type="geojson" data={buildFeatures()}>
                  <Layer {...lineLayer} />
                </Source>
                {/* Nodes with numbers */}
                {dispatchData?.routes?.map((r: any, idx: number) => {
                  if (selectedTruckId !== null && selectedTruckId !== idx) return null;
                  return r.schedule.map((s: any, step: number) => {
                    if (step === r.schedule.length - 1) return null;
                    const n = [...network.warehouses, ...network.distributors, ...network.plants].find(n => n.id === s.loc);
                    if (!n) return null;
                    const isHovered = hoveredNodeId === s.loc;
                    return (
                      <Marker key={`${idx}-${step}`} longitude={n.coordinates[1]} latitude={n.coordinates[0]}>
                        <div 
                          onMouseEnter={() => setHoveredNodeId(s.loc)}
                          onMouseLeave={() => setHoveredNodeId(null)}
                          className={`w-4 h-4 rounded-full border-2 border-sys-black flex items-center justify-center text-[8px] font-bold cursor-pointer transition-transform ${isHovered ? 'scale-150 bg-yellow-400 z-50' : 'bg-white z-10'}`}
                        >
                          {step === 0 ? 'D' : step}
                        </div>
                      </Marker>
                    );
                  });
                })}
              </SCMMap>
            </div>
          )}
        </div>

        {/* Dispatch Data & Gantt */}
        <div className="col-span-1 border-2 border-sys-black bg-white shadow-[2px_2px_0px_#000] p-3 flex flex-col overflow-y-auto h-96">
          <h3 className="font-bold border-b border-sys-black mb-2 uppercase">VRPTW Schedule & Load</h3>
          <div className="text-[10px] mb-2 bg-gray-100 p-2 border border-sys-black space-y-1">
            <p><strong>Fleet Logic:</strong> Solver-selected Heterogeneous Mix (HCV 16T + ICV 9T)</p>
            <p><strong>Rules:</strong> Configurable Max 9h driving/day (Motor Transport Workers Act). Two-driver enabled (18h limit). E-Way bill valid for 48h (1 day/200km check passed).</p>
            <p><strong>Status:</strong> {dispatchData?.status === "optimal" ? "Feasible & Optimized" : "Infeasible"}</p>
          </div>
          <GanttChart routes={dispatchData?.routes} />
        </div>

        {/* Analytics row */}
        <div className="col-span-2 grid grid-cols-3 gap-4">
          <div className="border-2 border-sys-black bg-white shadow-[2px_2px_0px_#000] p-2 flex flex-col">
            <h3 className="font-bold border-b border-sys-black mb-1">Truck Class Assignment</h3>
            <table className="w-full text-[10px] text-left mt-2">
              <thead><tr className="border-b border-sys-black"><th>Class</th><th>Cost/km</th><th>Selected</th></tr></thead>
              <tbody>
                <tr className="opacity-50"><td>LCV (4T)</td><td>₹18</td><td>0</td></tr>
                <tr className={selectedTruckId === 1 ? 'bg-yellow-200' : 'bg-green-100'}><td>ICV (9T)</td><td>₹25</td><td>1 Route</td></tr>
                <tr className={selectedTruckId === 0 ? 'bg-yellow-200' : 'bg-green-100'}><td>HCV (16T)</td><td>₹38</td><td>1 Route</td></tr>
              </tbody>
            </table>
          </div>
          <div className="border-2 border-sys-black bg-white shadow-[2px_2px_0px_#000] p-2 flex flex-col">
            <h3 className="font-bold border-b border-sys-black mb-1">Load-Factor Target</h3>
            <div className="flex-1 flex items-end gap-1 mt-2">
              <div className="w-full bg-blue-200 h-1/2 relative group border-t border-sys-black"><span className="absolute -top-4 text-[8px]">60%: ₹4.5/cs</span></div>
              <div className="w-full bg-blue-400 h-3/4 relative group border-t border-sys-black"><span className="absolute -top-4 text-[8px]">80%: ₹3.1/cs</span></div>
              <div className="w-full bg-blue-600 h-full relative group border-t border-sys-black"><span className="absolute -top-4 text-[8px]">100%: ₹2.6/cs</span></div>
            </div>
          </div>
          <div className="border-2 border-sys-black bg-white shadow-[2px_2px_0px_#000] p-2 flex flex-col">
            <h3 className="font-bold border-b border-sys-black mb-1">Fleet Emissions Tracker</h3>
            <div className="text-[10px] space-y-1 mt-2">
              <p>Estimated CO2: ~450 kg</p>
              <div className="w-full bg-gray-200 h-2 mt-1 border border-sys-black">
                <div className="bg-green-500 h-full w-2/3"></div>
              </div>
              <p className="text-[8px] text-right">66% of target budget</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
