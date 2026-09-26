'use client';
import React, { useState, useEffect } from 'react';
import { fetchNetworkData } from '@/lib/api';
import { Marker, Source, Layer } from 'react-map-gl/maplibre';
import { SCMMap } from '../../ui/SCMMap';
import 'maplibre-gl/dist/maplibre-gl.css';
import { calculateFreightCost } from '@/lib/calculator';
import clsx from 'clsx';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useGovernanceStore } from '@/lib/governanceStore';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export function RouteOptimizer() {
  const enqueue = useGovernanceStore(state => state.enqueue);
  const [phase4a, setPhase4a] = useState<any>(null);
  const [network, setNetwork] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('Geographic');
  const [orionOpen, setOrionOpen] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<string | null>('PUN-RAI');
  
  useEffect(() => {
    fetchNetworkData().then(setNetwork);
    fetch('/precomputed/phase4a.json')
      .then(r => r.json())
      .then(setPhase4a)
      .catch(e => console.error("Could not load phase4a data", e));
  }, []);

  if (!network || !phase4a) return <div className="p-4 font-mono font-bold">Initializing Routing Engine...</div>;

  const currentPaths = phase4a?.k_shortest?.['WH-PUN_DIST-RAI'] || [];
  const altPaths = phase4a?.k_shortest?.['WH-NAG_DIST-RAI'] || [];

  const buildFeatures = () => {
    const features: any[] = [];
    if (currentPaths.length > 0) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: currentPaths[0].coordinates },
        properties: { type: 'baseline', color: '#ff4d4f' }
      });
    }
    if (altPaths.length > 0) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: altPaths[0].coordinates },
        properties: { type: 'alternate', color: '#005662' }
      });
    }
    return { type: 'FeatureCollection', features };
  };

  const lineLayer: any = {
    id: 'route-lines',
    type: 'line',
    paint: {
      'line-color': ['get', 'color'],
      'line-width': ['match', ['get', 'type'], 'baseline', 3, 'alternate', 5, 2],
      'line-dasharray': ['match', ['get', 'type'], 'alternate', ['literal', [2, 2]], ['literal', [1]]]
    }
  };

  const costData = {
    labels: ['Pune → RAI', 'Nagpur → RAI'],
    datasets: [{
      label: 'Landed Cost (₹)',
      data: [currentPaths[0]?.total_cost || 0, altPaths[0]?.total_cost || 0],
      backgroundColor: ['#1F2937', '#FFC000'],
      borderWidth: 1,
      borderColor: '#1F2937'
    }]
  };

  const timeData = {
    labels: ['Pune → RAI', 'Nagpur → RAI'],
    datasets: [{
      label: 'Transit Time (hrs)',
      data: [currentPaths[0]?.total_time || 0, altPaths[0]?.total_time || 0],
      backgroundColor: ['#1F2937', '#005662'],
      borderWidth: 1,
      borderColor: '#1F2937'
    }]
  };

  return (
    <div className="flex w-full h-full bg-sys-bg text-sys-black font-sans relative overflow-hidden">
        
        {/* Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
            {/* Top Bar */}
            <div className="flex border-b border-sys-black bg-white overflow-x-auto shrink-0 shadow-sm z-10">
                {['Geographic', 'Tactical', 'Dispatch'].map(t => (
                    <div 
                        key={t}
                        onClick={() => setActiveTab(t)}
                        className={clsx(
                            "px-5 py-2 cursor-pointer border-r border-sys-black text-sm font-semibold whitespace-nowrap transition-colors",
                            activeTab === t ? "bg-[var(--sys-teal)] text-white" : "hover:bg-gray-100"
                        )}
                    >
                        {t} View
                    </div>
                ))}
            </div>

            <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
                
                {/* Geographic View */}
                {activeTab === 'Geographic' && (
                    <div className="flex-1 flex flex-col gap-4">
                        <div className="flex-1 border border-sys-black bg-white shadow-sm relative flex flex-col">
                            <div className="bg-[var(--sys-teal)] text-white px-3 py-2 font-bold text-sm border-b border-sys-black">Network Topology & Routing</div>
                            <div className="flex-1 relative">
                                <SCMMap initialViewState={{ longitude: 77.5, latitude: 20.5, zoom: 5 }}>
                                    <Source id="routes" type="geojson" data={buildFeatures() as any}>
                                        <Layer {...lineLayer} />
                                    </Source>
                                    
                                    {/* Markers */}
                                    <Marker longitude={73.85} latitude={18.52}><div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-md"></div></Marker>
                                    <Marker longitude={79.08} latitude={21.14}><div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-md"></div></Marker>
                                    <Marker longitude={81.63} latitude={21.25}><div className="w-4 h-4 bg-[var(--sys-teal)] rotate-45 border-2 border-white shadow-md"></div></Marker>
                                </SCMMap>
                                
                                {/* Overlay Legend */}
                                <div className="absolute bottom-4 left-4 bg-white/90 border border-sys-black p-3 shadow-md font-sans text-xs">
                                    <div className="font-bold mb-2">Lane Legend</div>
                                    <div className="flex items-center gap-2 mb-1"><div className="w-4 h-1 bg-red-500"></div> Baseline (Pune-Raipur)</div>
                                    <div className="flex items-center gap-2"><div className="w-4 h-0 border-t-2 border-dashed border-[var(--sys-teal)]"></div> Alternate (Nagpur-Raipur)</div>
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0 h-40 grid grid-cols-3 gap-4">
                            <div className="border border-sys-black bg-white shadow-sm p-4 flex flex-col justify-center">
                                <div className="text-sm font-bold text-gray-500">Baseline Cost (Pune)</div>
                                <div className="text-2xl font-bold font-mono">₹{currentPaths[0]?.total_cost.toLocaleString()}</div>
                                <div className="text-xs text-red-600 mt-1 font-bold">High Delay Risk</div>
                            </div>
                            <div className="border border-[var(--sys-amber)] bg-yellow-50 shadow-[4px_4px_0_var(--sys-amber)] p-4 flex flex-col justify-center">
                                <div className="text-sm font-bold text-[var(--sys-teal)]">Alternate Cost (Nagpur)</div>
                                <div className="text-2xl font-bold font-mono text-[var(--sys-teal)]">₹{altPaths[0]?.total_cost.toLocaleString()}</div>
                                <div className="text-xs text-green-700 mt-1 font-bold">Stable Lane</div>
                            </div>
                            <div className="border border-sys-black bg-[var(--sys-teal)] text-white shadow-sm p-4 flex flex-col justify-center text-center">
                                <div className="text-sm font-bold opacity-80">Trip Savings</div>
                                <div className="text-3xl font-bold font-mono text-[var(--sys-amber)]">₹{(currentPaths[0]?.total_cost - altPaths[0]?.total_cost).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tactical View */}
                {activeTab === 'Tactical' && (
                    <div className="flex-1 flex gap-4">
                        <div className="w-1/2 flex flex-col gap-4">
                            <div className="border border-sys-black bg-white shadow-sm p-4 flex-1">
                                <h3 className="font-bold text-sm mb-4 border-b border-gray-200 pb-2">Cost Comparison (₹)</h3>
                                <div className="h-64"><Bar data={costData} options={{ maintainAspectRatio: false }} /></div>
                            </div>
                            <div className="border border-sys-black bg-white shadow-sm p-4 flex-1">
                                <h3 className="font-bold text-sm mb-4 border-b border-gray-200 pb-2">Transit Time (hrs)</h3>
                                <div className="h-64"><Bar data={timeData} options={{ maintainAspectRatio: false, indexAxis: 'y' }} /></div>
                            </div>
                        </div>

                        <div className="w-1/2 border border-sys-black bg-white shadow-sm flex flex-col">
                            <div className="bg-[var(--sys-teal)] text-white px-3 py-2 font-bold text-sm border-b border-sys-black">Yen's K-Shortest Paths</div>
                            <div className="flex-1 p-4 overflow-y-auto font-mono text-sm">
                                <div className="mb-4">
                                    <div className="font-bold text-red-700 mb-2 font-sans bg-red-50 p-2 border border-red-200">Baseline Routes (PUN → RAI)</div>
                                    {currentPaths.map((p: any, i: number) => (
                                        <div key={i} className="flex justify-between border-b border-gray-100 py-2">
                                            <span>Option {i+1} ({p.path.length} hops)</span>
                                            <span className="font-bold text-gray-700">₹{p.total_cost.toFixed(0)} | {p.total_time.toFixed(1)}h | {p.total_distance.toFixed(0)}km</span>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <div className="font-bold text-[var(--sys-teal)] mb-2 font-sans bg-teal-50 p-2 border border-teal-200">Alternate Routes (NAG → RAI)</div>
                                    {altPaths.map((p: any, i: number) => (
                                        <div key={i} className="flex justify-between border-b border-gray-100 py-2">
                                            <span>Option {i+1} ({p.path.length} hops)</span>
                                            <span className="font-bold text-gray-700">₹{p.total_cost.toFixed(0)} | {p.total_time.toFixed(1)}h | {p.total_distance.toFixed(0)}km</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Dispatch View */}
                {activeTab === 'Dispatch' && (
                    <div className="flex-1 flex gap-4">
                        <div className="w-1/2 flex flex-col gap-4">
                            <div className="border border-sys-black bg-white shadow-sm flex flex-col flex-1">
                                <div className="bg-[var(--sys-teal)] text-white px-3 py-2 font-bold text-sm border-b border-sys-black">Local CVRP Routing (Nagpur Hub)</div>
                                <div className="p-4 flex-1 overflow-y-auto">
                                    <div className="text-sm mb-4 bg-gray-50 p-3 border border-sys-black/20 text-gray-700">
                                        <strong className="text-sys-black">Optimization Result:</strong> Merged {phase4a?.cvrp_nagpur?.routes?.length || 0} multi-stop routes, saving {(11200 - (phase4a?.cvrp_nagpur?.total_distance || 11200)).toFixed(0)} km compared to point-to-point dispatch.
                                    </div>
                                    <div className="space-y-3">
                                        {(phase4a?.cvrp_nagpur?.routes || []).map((r: any, i: number) => (
                                            <div key={i} className="border border-sys-black/10 p-3 hover:bg-yellow-50 transition-colors">
                                                <div className="font-bold text-sm flex justify-between">
                                                    <span>Truck {r.vehicle} (25T)</span>
                                                    <span className="text-[var(--sys-teal)] font-mono">{r.distance.toFixed(0)} km</span>
                                                </div>
                                                <div className="text-xs font-mono text-gray-500 mt-2 flex flex-wrap gap-1">
                                                    {r.route.map((node: string, j: number) => (
                                                        <React.Fragment key={j}>
                                                            <span className="bg-white border border-gray-300 px-1">{node}</span>
                                                            {j < r.route.length - 1 && <span>→</span>}
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-1/2 flex flex-col gap-4">
                            <div className="border border-sys-black bg-white shadow-sm flex flex-col flex-1">
                                <div className="bg-[var(--sys-teal)] text-white px-3 py-2 font-bold text-sm border-b border-sys-black">3D Bin Packing Summary</div>
                                <div className="p-4 flex-1 overflow-y-auto grid grid-cols-2 gap-3">
                                    {(phase4a?.bin_packing_demo?.bins || []).map((b: any, i: number) => (
                                        <div key={i} className="border border-sys-black p-3 bg-gray-50 shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                                            <div className="font-bold text-sm border-b border-gray-200 pb-1 mb-2 text-[var(--sys-teal)]">Container {i+1}</div>
                                            <div className="text-xs font-mono space-y-1 mb-3">
                                                <div className="flex justify-between"><span>Weight:</span> <span>{(b.weight/1000).toFixed(1)} / 9.0 MT</span></div>
                                                <div className="flex justify-between"><span>Volume:</span> <span>{b.volume.toFixed(1)} / 25.0 m³</span></div>
                                            </div>
                                            <div className="text-[10px] font-sans text-gray-500 leading-tight">
                                                Contains: {b.items.join(', ')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>

        {/* Orion Embedded Agent Panel */}
        {orionOpen && (
            <div className="w-72 bg-white border-l border-sys-black flex flex-col shadow-[-4px_0_15px_rgba(0,0,0,0.05)] z-20 shrink-0">
                <div className="bg-[var(--sys-teal)] text-white px-3 py-2 font-bold text-sm flex justify-between items-center border-b border-sys-black">
                    <div className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-[var(--sys-amber)]">
                            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon>
                        </svg>
                        Orion Agent
                    </div>
                    <button onClick={() => setOrionOpen(false)} className="hover:bg-white/20 rounded-sm p-0.5">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto text-sm font-sans space-y-5">
                    
                    <div className="bg-gray-50 border border-sys-black/10 p-2 rounded-sm">
                        <div className="text-[10px] text-gray-500 font-mono mb-1 border-b border-gray-200 pb-1">ORION EXECUTION TRACE</div>
                        <div className="space-y-1.5 font-mono text-[10px] mt-2">
                            <div className="flex gap-2 text-green-700"><span>✓</span> <span>Loaded Yen's K-Shortest</span></div>
                            <div className="flex gap-2 text-green-700"><span>✓</span> <span>Calculated CVRP Distances</span></div>
                            <div className="flex gap-2 text-green-700"><span>✓</span> <span>Executed Bin Packing heuristics</span></div>
                            <div className="flex gap-2 text-blue-600 animate-pulse"><span>●</span> <span>Awaiting Logistics Approval</span></div>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-[var(--sys-teal)] mb-1">Network Exception Analysis</h4>
                        <p className="text-gray-700 text-xs leading-relaxed">
                            The primary lane <span className="font-bold">Pune → Raipur</span> is showing high variability due to weather delays.
                        </p>
                    </div>

                    <div className="bg-[var(--sys-amber)]/20 border border-[var(--sys-amber)] p-3 text-xs">
                        <strong className="block mb-2 text-sys-black">Orion Recommendation</strong>
                        Fulfill the Raipur Distributor from the <span className="font-bold">Nagpur CFA</span> instead. 
                        This increases primary distance, but prevents high penalty delay costs, resulting in a net saving of <strong className="text-green-700">₹{(currentPaths[0]?.total_cost - altPaths[0]?.total_cost).toLocaleString()} per trip</strong>.
                        
                        <button className="w-full mt-3 bg-[var(--sys-teal)] text-white py-2 font-bold shadow-sm hover:brightness-110 transition-all border border-sys-black" onClick={() => {
                            const res = enqueue(
                                'approve emergency reroute',
                                'Orion Orchestrator',
                                { lane: 'Nagpur → Raipur', alt_for: 'Pune → Raipur' },
                                { risk: 'High Delay Risk', cost: currentPaths[0]?.total_cost },
                                { risk: 'Stable', cost: altPaths[0]?.total_cost }
                            );
                            if (res.success) alert("Draft plan sent to Supply Chain Director for RACI check.");
                            else alert(`Governance Blocked: ${res.reason}`);
                        }}>
                            Draft Plan for Approval
                        </button>
                    </div>

                    <div className="text-[10px] text-gray-400 font-mono">
                        Rule <span className="text-gray-600 font-bold">RACI-LOG-04</span>: Network rerouting &gt; 10% volume requires Supply Chain Director (A).
                    </div>
                </div>
            </div>
        )}
        {!orionOpen && (
            <div 
                className="w-8 bg-gray-100 border-l border-sys-black flex flex-col items-center py-2 cursor-pointer hover:bg-gray-200 shrink-0"
                onClick={() => setOrionOpen(true)}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-[var(--sys-teal)]">
                    <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon>
                </svg>
            </div>
        )}
    </div>
  );
}
