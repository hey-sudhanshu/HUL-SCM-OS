'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Truck, Activity } from 'lucide-react';
import { fetchNetworkData } from '@/lib/api';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function FreightCalc() {
  const [network, setNetwork] = useState<any>(null);
  const [origin, setOrigin] = useState<string>('PL-HAL');
  const [destination, setDestination] = useState<string>('WH-PUN');
  const [vehicleId, setVehicleId] = useState<string>('TRK-32FT-MX');
  const [calculated, setCalculated] = useState(false);

  useEffect(() => {
    fetchNetworkData().then(setNetwork);
  }, []);

  const handleCalculate = () => {
    setCalculated(true);
  };

  const lane = useMemo(() => {
    if (!network || !network.lanes) return null;
    return network.lanes.find((l: any) => l.source_id === origin && l.dest_id === destination);
  }, [network, origin, destination]);

  const vehicle = useMemo(() => {
    if (!network || !network.fleet) return null;
    return network.fleet.find((v: any) => v.id === vehicleId);
  }, [network, vehicleId]);

  const costParams = network?.cost_parameters || {};

  const metrics = useMemo(() => {
    if (!lane || !vehicle || !calculated) return null;
    
    const distance = lane.distance_km || 0;
    const costPerTripLane = lane.cost_per_trip || 0;
    
    // Some basic derivations
    const fixedVehicleCost = vehicle.fixed_cost_per_trip || 0;
    const variableCostPerKm = vehicle.cost_per_km || 0;
    const derivedTripCost = fixedVehicleCost + (variableCostPerKm * distance);
    
    // we use lane cost_per_trip as total cost for scenario
    const totalCost = costPerTripLane > 0 ? costPerTripLane : derivedTripCost;
    const costPerKm = distance > 0 ? totalCost / distance : 0;
    
    return {
      distance,
      totalCost,
      costPerKm,
      transitTime: lane.planned_transit_hours || 0,
      actualMean: lane.actual_transit_mean || 0,
      fixedCost: fixedVehicleCost,
      variableCost: totalCost - fixedVehicleCost
    };
  }, [lane, vehicle, calculated]);

  const delayChartData = useMemo(() => {
    if (!lane || !lane.delay_causes || !calculated) return null;
    
    const causes = Object.keys(lane.delay_causes);
    const values = causes.map(c => lane.delay_causes[c]);
    
    return {
      labels: causes.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
      datasets: [
        {
          label: 'Delay Probability',
          data: values,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        }
      ]
    };
  }, [lane, calculated]);

  if (!network) return <div className="p-8 text-slate-400 font-mono">Loading data...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-slate-800 bg-slate-950">
        <Truck className="w-5 h-5 text-blue-400 mr-3" />
        <h1 className="text-lg font-bold text-slate-100 tracking-wider">FREIGHT CALCULATOR</h1>
      </div>

      {/* Toolbar */}
      <div className="flex items-center p-4 gap-4 border-b border-slate-800 bg-slate-900 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">ORIGIN:</span>
          <select 
            className="bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1 rounded text-sm focus:outline-none focus:border-blue-500"
            value={origin}
            onChange={(e) => { setOrigin(e.target.value); setCalculated(false); }}
          >
            {[...(network.plants || []), ...(network.warehouses || [])].map((p: any) => (
              <option key={p.id} value={p.id}>{p.id}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">DEST:</span>
          <select 
            className="bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1 rounded text-sm focus:outline-none focus:border-blue-500"
            value={destination}
            onChange={(e) => { setDestination(e.target.value); setCalculated(false); }}
          >
            {[...(network.warehouses || []), ...(network.distributors || [])].map((w: any) => (
              <option key={w.id} value={w.id}>{w.id}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">VEHICLE:</span>
          <select 
            className="bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1 rounded text-sm focus:outline-none focus:border-blue-500"
            value={vehicleId}
            onChange={(e) => { setVehicleId(e.target.value); setCalculated(false); }}
          >
            {(network.fleet || []).map((v: any) => (
              <option key={v.id} value={v.id}>{v.id} ({v.type})</option>
            ))}
          </select>
        </div>

        <button 
          onClick={handleCalculate}
          className="ml-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-1 rounded text-sm font-bold transition-colors"
        >
          CALCULATE
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-slate-800 bg-slate-950/50">
        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <div className="text-slate-500 text-xs mb-1">TOTAL COST</div>
          <div className="text-xl font-bold text-slate-100">
            {calculated && metrics ? formatCurrency(metrics.totalCost) : 'N/A'}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <div className="text-slate-500 text-xs mb-1">COST / KM</div>
          <div className="text-xl font-bold text-slate-100">
            {calculated && metrics ? formatCurrency(metrics.costPerKm) : 'N/A'}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <div className="text-slate-500 text-xs mb-1">TRANSIT TIME</div>
          <div className="text-xl font-bold text-slate-100">
            {calculated && metrics ? `${formatNumber(metrics.transitTime)} hrs` : 'N/A'}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <div className="text-slate-500 text-xs mb-1">DISTANCE</div>
          <div className="text-xl font-bold text-slate-100">
            {calculated && metrics ? `${formatNumber(metrics.distance)} km` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        {!calculated ? (
          <div className="h-full flex items-center justify-center text-slate-500 flex-col">
            <Truck className="w-16 h-16 mb-4 opacity-20" />
            <p>Select parameters and click Calculate to view freight details</p>
          </div>
        ) : !lane ? (
          <div className="h-full flex items-center justify-center text-amber-500 flex-col">
            <Activity className="w-16 h-16 mb-4 opacity-20" />
            <p>No lane data found for this origin and destination pair.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 h-full auto-rows-fr">
            {/* TOP-LEFT: Route Details */}
            <div className="bg-slate-800/50 border border-slate-700 rounded p-4 flex flex-col">
              <h3 className="text-slate-300 font-bold mb-4 border-b border-slate-700 pb-2">Route Details</h3>
              <div className="space-y-4 flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Origin</span>
                  <span className="text-slate-200 font-bold">{origin}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Destination</span>
                  <span className="text-slate-200 font-bold">{destination}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Distance</span>
                  <span className="text-slate-200 font-bold">{formatNumber(metrics?.distance || 0)} km</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Planned Transit</span>
                  <span className="text-slate-200 font-bold">{formatNumber(metrics?.transitTime || 0)} hrs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Actual Transit (Mean)</span>
                  <span className="text-amber-400 font-bold">{formatNumber(metrics?.actualMean || 0)} hrs</span>
                </div>
              </div>
            </div>

            {/* TOP-RIGHT: Cost Breakdown */}
            <div className="bg-slate-800/50 border border-slate-700 rounded p-4 flex flex-col">
              <h3 className="text-slate-300 font-bold mb-4 border-b border-slate-700 pb-2">Cost Breakdown</h3>
              <div className="space-y-4 flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Fixed Vehicle Cost</span>
                  <span className="text-slate-200 font-bold">{formatCurrency(metrics?.fixedCost || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Variable Cost</span>
                  <span className="text-slate-200 font-bold">{formatCurrency(metrics?.variableCost || 0)}</span>
                </div>
                <div className="border-t border-slate-700 pt-3 flex justify-between items-center mt-auto">
                  <span className="text-slate-300 font-bold">Total Estimated Cost</span>
                  <span className="text-blue-400 font-bold text-lg">{formatCurrency(metrics?.totalCost || 0)}</span>
                </div>
              </div>
            </div>

            {/* BOTTOM-LEFT: Vehicle/Load */}
            <div className="bg-slate-800/50 border border-slate-700 rounded p-4 flex flex-col">
              <h3 className="text-slate-300 font-bold mb-4 border-b border-slate-700 pb-2">Vehicle Specification</h3>
              <div className="space-y-4 flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Type</span>
                  <span className="text-slate-200 font-bold">{vehicle?.type || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Capacity (Weight)</span>
                  <span className="text-slate-200 font-bold">{formatNumber(vehicle?.capacity_kg || 0)} kg</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Capacity (Volume)</span>
                  <span className="text-slate-200 font-bold">{formatNumber(vehicle?.capacity_m3 || 0)} m³</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Vehicle Cost/Km</span>
                  <span className="text-slate-200 font-bold">{formatCurrency(vehicle?.cost_per_km || 0)}</span>
                </div>
                <div className="mt-4 bg-slate-900 p-3 rounded border border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-amber-500 font-bold">SCENARIO ASSUMPTION</span>
                  </div>
                  <div className="text-sm text-slate-300">
                    Assuming 100% capacity utilization for this calculation.
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM-RIGHT: Lane Analytics */}
            <div className="bg-slate-800/50 border border-slate-700 rounded p-4 flex flex-col">
              <h3 className="text-slate-300 font-bold mb-4 border-b border-slate-700 pb-2">Delay Causes Breakdown</h3>
              <div className="flex-1 w-full h-full min-h-[150px] relative">
                {delayChartData ? (
                  <Bar 
                    data={delayChartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      scales: {
                        x: {
                          grid: { color: 'rgba(255,255,255,0.05)' },
                          ticks: { color: '#94a3b8' },
                          max: 1
                        },
                        y: {
                          grid: { display: false },
                          ticks: { color: '#94a3b8' }
                        }
                      },
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context) => formatPercent(context.raw as number)
                          }
                        }
                      }
                    }} 
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                    No delay data available for this lane
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
