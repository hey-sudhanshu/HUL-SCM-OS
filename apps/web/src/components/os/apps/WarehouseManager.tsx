import React, { useState, useEffect } from 'react';
import { fetchNetworkData } from '@/lib/api';
import { rankWarehouses, WarehouseCandidate } from '@/lib/calculator';
import { SCMMap } from '../../ui/SCMMap';
import { SCMKpiStrip } from '../../ui/SCMKpiStrip';
import { Marker } from 'react-map-gl/maplibre';

export function WarehouseManager() {
  const [data, setData] = useState<any>(null);
  const [targetDist, setTargetDist] = useState('DIST-RAI'); // Default to Raipur cluster demo
  const targetNodeData = data?.distributors?.find((d:any) => d.id === targetDist);
  
  const [weights, setWeights] = useState({
    w_distance: 0.2,
    w_cost: 0.2,
    w_headroom: 0.1,
    w_transit_time: 0.2,
    w_reliability: 0.1,
    w_availability: 0.2
  });

  const [maxDistance, setMaxDistance] = useState<number>(600);
  const [maxTransit, setMaxTransit] = useState<number>(24);

  useEffect(() => {
    fetchNetworkData().then(setData);
  }, []);

  if (!data) return <div className="p-2">Loading...</div>;

  // 1. Gather all possible CFAs (actives only) for this target
  const rawCandidates: WarehouseCandidate[] = [];
  const candidateHubs: any[] = [];

  data.lanes.forEach((l: any) => {
    if (l.dest_id === targetDist) {
      const wh = data.warehouses.find((w: any) => w.id === l.source_id);
      if (wh) {
        if (wh.status === "candidate") {
           candidateHubs.push(wh);
        } else {
           rawCandidates.push({
             id: wh.id,
             distance_km: l.distance_km,
             cost_per_pallet: wh.operating_cost_per_pallet,
             capacity_headroom_pct: 1.0 - wh.utilization_pct,
             transit_mean: l.actual_transit_mean,
             transit_std: l.actual_transit_std,
             stock_availability: 0.95 // Mock for now
           });
        }
      }
    }
  });

  const ranked = rankWarehouses(rawCandidates, weights, maxDistance, maxTransit);
  
  // Find excluded
  const rankedIds = new Set(ranked.map(c => c.id));
  const excluded = rawCandidates.filter(c => !rankedIds.has(c.id));

  const handleWeightChange = (key: keyof typeof weights, value: number) => {
    setWeights(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col h-full bg-sys-gray font-mono text-xs">
      <div className="bg-sys-white border-b-2 border-sys-black p-2 flex justify-between items-center">
        <div className="font-bold">Warehouse Manager (Phase 3+4a)</div>
        <div className="text-[10px] bg-green-100 border border-green-800 px-2 py-0.5">Live Math</div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Controls */}
        <div className="w-64 bg-sys-white border-r-2 border-sys-black p-2 overflow-y-auto flex flex-col gap-4">
          <div>
            <label className="font-bold mb-1 block">Target Node:</label>
            <select 
              className="w-full border border-sys-black p-1"
              value={targetDist}
              onChange={e => setTargetDist(e.target.value)}
            >
              {data.distributors.slice(0, 20).map((d: any) => (
                <option key={d.id} value={d.id}>{d.cluster_name}</option>
              ))}
            </select>
          </div>
          <div className="border-t border-sys-black pt-2">
            <h4 className="font-bold mb-2">Feasibility Filters</h4>
            <div className="mb-2">
              <label>Max Dist: {maxDistance}km</label>
              <input type="range" min="100" max="3000" step="100" value={maxDistance} onChange={e => setMaxDistance(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label>Max Transit: {maxTransit}h</label>
              <input type="range" min="10" max="200" step="10" value={maxTransit} onChange={e => setMaxTransit(Number(e.target.value))} className="w-full" />
            </div>
          </div>
          <div className="border-t border-sys-black pt-2 flex flex-col gap-2">
            <h4 className="font-bold">Weights (Auto-norm)</h4>
            {Object.entries(weights).map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between">
                  <span>{k.replace('w_', '')}</span>
                  <span>{v.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.1" value={v}
                  onChange={e => handleWeightChange(k as keyof typeof weights, parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-sys-gray relative">
          <div className="h-1/2 border-b-2 border-sys-black relative">
            <SCMMap initialViewState={{ longitude: 79.0, latitude: 21.0, zoom: 4.5 }}>
                {/* Target */}
                {targetNodeData && targetNodeData.coordinates && (
                  <Marker longitude={targetNodeData.coordinates[1]} latitude={targetNodeData.coordinates[0]}>
                    <div className="w-5 h-5 rounded-full border-2 border-white bg-blue-500 shadow-lg flex items-center justify-center text-white text-[10px] font-bold">T</div>
                  </Marker>
                )}
                {/* Candidates */}
                {ranked.map(c => {
                  const node = data.warehouses.find((w:any) => w.id === c.id);
                  if(!node || !node.coordinates) return null;
                  return (
                    <Marker key={c.id} longitude={node.coordinates[1]} latitude={node.coordinates[0]}>
                      <div className="w-4 h-4 rounded-full border border-sys-black bg-yellow-400 cursor-pointer shadow-md" title={c.id} />
                    </Marker>
                  );
                })}
            </SCMMap>
          </div>
          <div className="h-1/2 overflow-y-auto p-4 bg-white">
          <SCMKpiStrip items={[
              { label: 'Feasible Hubs', value: ranked.length, color: '#1B998B' },
              { label: 'Excluded', value: excluded.length, color: '#E3352F' },
              { label: 'Top Score', value: ranked[0] ? (ranked[0].score * 100).toFixed(1) : '-', trend: 'up' },
          ]} />
          
          {candidateHubs.length > 0 && (
            <div className="my-4 bg-yellow-100 border-2 border-yellow-800 p-2 text-yellow-900 shadow-[2px_2px_0_var(--sys-black)] flex justify-between">
              <div>
                <h3 className="font-bold">New Hub Candidates Found</h3>
                {candidateHubs.map((c: any) => (
                  <div key={c.id}>
                    <strong>{c.id} ({c.name})</strong> — Setup: ₹{(c.setup_cost/100000).toFixed(0)}L | Lead: {c.lead_time_months}m
                  </div>
                ))}
              </div>
              <div className="text-right">
                <p className="font-bold">Payback Estimate (ROI)</p>
                <p>Est. Annual Save vs Pune: ₹30,603 x 100 trips = ₹30.6L</p>
                <p><strong>Payback: ~1.6 years</strong></p>
              </div>
            </div>
          )}

          <table className="w-full text-left border-collapse border border-sys-black bg-white mb-4">
            <thead>
              <tr className="bg-sys-black text-sys-white">
                <th className="p-1 border border-sys-black">Rank</th>
                <th className="p-1 border border-sys-black">CFA ID</th>
                <th className="p-1 border border-sys-black">Score</th>
                <th className="p-1 border border-sys-black">Dist</th>
                <th className="p-1 border border-sys-black">Transit</th>
                <th className="p-1 border border-sys-black">Cost/Pallet</th>
                <th className="p-1 border border-sys-black">Headroom</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((c, i) => (
                <tr key={c.id} className={i === 0 ? 'bg-green-100 font-bold' : 'hover:bg-gray-100'}>
                  <td className="p-1 border border-sys-black">{i + 1}</td>
                  <td className="p-1 border border-sys-black">{c.id}</td>
                  <td className="p-1 border border-sys-black">{(c.score * 100).toFixed(1)}</td>
                  <td className="p-1 border border-sys-black">{c.distance_km} km</td>
                  <td className="p-1 border border-sys-black">{c.transit_mean.toFixed(0)} h</td>
                  <td className="p-1 border border-sys-black">₹{c.cost_per_pallet.toFixed(2)}</td>
                  <td className="p-1 border border-sys-black">{(c.capacity_headroom_pct * 100).toFixed(1)}%</td>
                </tr>
              ))}
              {ranked.length === 0 && <tr><td colSpan={7} className="p-2 text-center">No feasible candidates found.</td></tr>}
            </tbody>
          </table>

          {excluded.length > 0 && (
            <div>
              <h3 className="font-bold border-b border-sys-black mb-2">Excluded by Feasibility Filters</h3>
              <table className="w-full text-left border-collapse border border-sys-black bg-gray-100 text-gray-500">
                <tbody>
                  {excluded.map(c => {
                    const failDist = c.distance_km > maxDistance;
                    const failTransit = c.transit_mean > maxTransit;
                    const reason = [];
                    if (failDist) reason.push(`Distance > ${maxDistance}km`);
                    if (failTransit) reason.push(`Transit > ${maxTransit}h`);
                    return (
                      <tr key={c.id}>
                        <td className="p-1 border border-sys-black w-32">{c.id}</td>
                        <td className="p-1 border border-sys-black italic text-red-500">{reason.join(' AND ')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
