import React, { useState, useEffect } from 'react';
import { fetchNetworkData } from '@/lib/api';
import { calculateFreightCost } from '@/lib/calculator';
import { Bar } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export function FreightCalc() {
  const [data, setData] = useState<any>(null);
  const [selectedLane, setSelectedLane] = useState<any>(null);
  const [selectedFleet, setSelectedFleet] = useState<any>(null);
  const [utilization, setUtilization] = useState<number>(80);

  useEffect(() => {
    fetchNetworkData().then(d => {
      setData(d);
      if (d.lanes.length > 0) setSelectedLane(d.lanes[0]);
      if (d.fleet.length > 0) setSelectedFleet(d.fleet[0]);
    });
  }, []);

  if (!data || !selectedLane || !selectedFleet) return <div className="p-4 font-mono text-xs">Loading calculator...</div>;

  const cp = { diesel_price_per_liter: 90, toll_per_km: 2.5, detention_cost_per_hour: 200, driver_cost_per_day: 1200, fixed_vehicle_cost_per_day: selectedFleet.fixed_cost_per_trip || 3000, handling_cost_per_pallet: 50, insurance_rate_pct: 0.05, emission_factor_kg_co2_per_km: 1.2 };
  
  // Real calculation based on utilization
  const actualLoadKg = selectedFleet.capacity_kg * (utilization / 100);
  
  const result = calculateFreightCost(
    selectedLane.distance_km,
    selectedLane.planned_transit_hours || selectedLane.actual_transit_mean,
    selectedLane.actual_transit_mean,
    selectedLane.delay_causes?.hub_dwell || 0,
    5,
    actualLoadKg,
    cp
  );

  const chartData = {
    labels: ['Diesel', 'Toll', 'Fixed', 'Detention'],
    datasets: [{
        label: 'Cost Breakdown (₹)',
        data: [result.diesel_cost, result.toll_cost, result.fixed_cost, result.detention_cost],
        backgroundColor: ['#1B998B', '#FBBF24', '#4B5563', '#E3352F'],
        borderWidth: 1,
        borderColor: '#000'
    }]
  };

  return (
    <div className="flex flex-col h-full bg-sys-white font-mono text-xs overflow-y-auto">
      <div className="font-bold border-b-2 border-sys-black p-2 bg-gray-100 flex justify-between items-center shrink-0">
          <span>Freight & Cost Calculator</span>
          <span className="bg-green-100 text-green-800 border border-green-800 px-2 py-0.5 text-[10px]">Live Data</span>
      </div>
      
      <div className="p-4 grid grid-cols-2 gap-6 flex-1">
          {/* Controls */}
          <div className="space-y-4">
            <div className="border border-sys-black p-3 bg-gray-50 shadow-[2px_2px_0_var(--sys-black)]">
            <label className="font-bold block mb-2 text-[var(--sys-teal)] border-b border-gray-300 pb-1">Select Route</label>
            <select 
                className="w-full border border-sys-black p-2 text-xs"
                value={selectedLane.source_id + '_' + selectedLane.dest_id}
                onChange={(e) => {
                const [src, dest] = e.target.value.split('_');
                setSelectedLane(data.lanes.find((l: any) => l.source_id === src && l.dest_id === dest));
                }}
            >
                {data.lanes.slice(0, 50).map((l: any, i: number) => (
                <option key={i} value={l.source_id + '_' + l.dest_id}>
                    {l.source_id} → {l.dest_id} ({l.distance_km}km Est)
                </option>
                ))}
            </select>
            <div className="mt-3 flex justify-between">
                <span>Mean Transit: <strong className={selectedLane.actual_transit_mean > 24 ? "text-red-500" : ""}>{selectedLane.actual_transit_mean}h</strong></span>
                {selectedLane.monsoon_vulnerable && <span className="bg-red-100 text-red-600 font-bold px-1 border border-red-200">MONSOON RISK</span>}
            </div>
            </div>

            <div className="border border-sys-black p-3 bg-gray-50 shadow-[2px_2px_0_var(--sys-black)]">
            <label className="font-bold block mb-2 text-[var(--sys-teal)] border-b border-gray-300 pb-1">Fleet & Utilization</label>
            <select 
                className="w-full border border-sys-black p-2 mb-3 text-xs"
                value={selectedFleet.id}
                onChange={(e) => setSelectedFleet(data.fleet.find((f: any) => f.id === e.target.value))}
            >
                {data.fleet.map((f: any) => (
                <option key={f.id} value={f.id}>{f.type} ({f.capacity_kg}kg)</option>
                ))}
            </select>
            <div className="space-y-1">
                <label className="flex justify-between font-bold"><span>Load Utilization</span> <span>{utilization}%</span></label>
                <input 
                    type="range" min="10" max="100" step="5" 
                    value={utilization} 
                    onChange={e => setUtilization(Number(e.target.value))} 
                    className="w-full" 
                />
                <div className="text-right text-gray-500 text-[10px]">Actual Load: {(actualLoadKg / 1000).toFixed(1)} Tons</div>
            </div>
            </div>
          </div>

          {/* Results */}
          <div className="flex flex-col h-full space-y-4">
              <div className="border-2 border-sys-black p-3 bg-white shadow-[4px_4px_0_var(--sys-black)]">
                  <h3 className="font-bold text-sm border-b-2 border-sys-black pb-1 mb-2">Cost Breakdown</h3>
                  <div className="h-48 mb-4">
                      <Bar 
                          data={chartData} 
                          options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#e5e7eb' } }, x: { grid: { display: false } } } }} 
                      />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-gray-200 pt-3">
                      <div className="flex justify-between"><span>Diesel:</span> <span>₹{result.diesel_cost.toFixed(0)}</span></div>
                      <div className="flex justify-between"><span>Toll:</span> <span>₹{result.toll_cost.toFixed(0)}</span></div>
                      <div className="flex justify-between"><span>Fixed:</span> <span>₹{result.fixed_cost.toFixed(0)}</span></div>
                      <div className="flex justify-between text-red-600"><span>Detention:</span> <span>₹{result.detention_cost.toFixed(0)}</span></div>
                  </div>
                  <div className="flex justify-between border-t-2 border-sys-black mt-3 pt-2 text-sm font-bold bg-green-100 p-2">
                      <span>TOTAL ESTIMATE</span>
                      <span>₹{result.total_cost.toFixed(0)}</span>
                  </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center border-2 border-sys-black shadow-[2px_2px_0_var(--sys-black)] bg-white divide-x divide-sys-black">
                  <div className="p-2 flex flex-col justify-center">
                      <div className="text-[10px] text-gray-500 font-bold mb-1">Cost / km</div>
                      <div className="font-bold text-lg text-[var(--sys-teal)]">₹{result.cost_per_km.toFixed(1)}</div>
                  </div>
                  <div className="p-2 flex flex-col justify-center bg-yellow-50">
                      <div className="text-[10px] text-gray-500 font-bold mb-1">Cost / Tonne-km</div>
                      <div className="font-bold text-lg text-[var(--sys-amber)]">₹{result.cost_per_tonne_km.toFixed(2)}</div>
                  </div>
                  <div className="p-2 flex flex-col justify-center">
                      <div className="text-[10px] text-gray-500 font-bold mb-1">Cost / Case (10kg)</div>
                      <div className="font-bold text-lg">₹{result.cost_per_case.toFixed(1)}</div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}
