"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Warehouse, ArrowUpDown } from "lucide-react";
import SCMMap, { MapNode } from "@/components/map/SCMMap";
import { formatNumber, formatPercent, formatCurrency } from "@/lib/format";

const fetchNetworkData = async () => {
  try {
    const res = await fetch("/precomputed/network.json");
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
};

type SortKey = "id" | "location" | "type" | "capacity_pallets" | "utilization_pct" | "dock_count";

export default function WarehouseManager() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWhId, setSelectedWhId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("capacity_pallets");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    fetchNetworkData().then((d) => {
      if (d) setData(d);
      setLoading(false);
    });
  }, []);

  const warehouses = useMemo(() => {
    if (!data || !data.warehouses) return [];
    let whs = [...data.warehouses];
    whs.sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
    return whs;
  }, [data, sortKey, sortAsc]);

  const kpis = useMemo(() => {
    if (!warehouses.length) return { count: 0, capacity: 0, util: 0, cost: 0 };
    const count = warehouses.length;
    let cap = 0, utilSum = 0, cost = 0;
    warehouses.forEach(w => {
      cap += (w.capacity_pallets || 0);
      utilSum += (w.utilization_pct || 0);
      cost += (w.operating_cost_per_pallet || 0) * (w.capacity_pallets || 0); // Rough proxy for total cost
    });
    return { count, capacity: cap, util: utilSum / count, cost };
  }, [warehouses]);

  const mapNodes = useMemo<MapNode[]>(() => {
    return warehouses.map(w => ({ ...w, type: w.type || "warehouse" }));
  }, [warehouses]);

  const selectedWh = useMemo(() => {
    return warehouses.find(w => w.id === selectedWhId) || null;
  }, [warehouses, selectedWhId]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-white font-mono flex items-center justify-center h-full">LOADING WAREHOUSE DATA...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-black text-gray-200 font-mono text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-800 bg-gray-950">
        <Warehouse className="text-amber-500" />
        <h1 className="text-xl font-bold tracking-tight text-white">WAREHOUSE INTELLIGENCE</h1>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-800 bg-gray-900/50">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Active WHs</span>
          <span className="text-lg font-semibold text-white">{kpis.count}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Total Capacity</span>
          <span className="text-lg font-semibold text-white">{formatNumber(kpis.capacity)} PLT</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Avg Utilization</span>
          <span className={`text-lg font-semibold ${kpis.util > 0.85 ? 'text-amber-500' : 'text-blue-400'}`}>
            {formatPercent(kpis.util)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Estimated Op Cost</span>
          <span className="text-lg font-semibold text-white">{formatCurrency(kpis.cost, "INR")}</span>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Table */}
        <div className="w-3/5 border-r border-gray-800 bg-gray-950 flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-900 sticky top-0 z-10 shadow">
                <tr>
                  {(["id", "location", "type", "capacity_pallets", "utilization_pct", "dock_count"] as SortKey[]).map(key => (
                    <th 
                      key={key} 
                      className="p-3 text-xs font-bold text-gray-400 uppercase cursor-pointer hover:text-white border-b border-gray-800"
                      onClick={() => handleSort(key)}
                    >
                      <div className="flex items-center gap-1">
                        {key.replace("_pct", " %").replace("_", " ")}
                        {sortKey === key && <ArrowUpDown size={12} className={sortAsc ? "rotate-180" : ""} />}
                      </div>
                    </th>
                  ))}
                  <th className="p-3 text-xs font-bold text-gray-400 uppercase border-b border-gray-800">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {warehouses.map(w => (
                  <tr 
                    key={w.id}
                    onClick={() => setSelectedWhId(w.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedWhId === w.id ? "bg-amber-900/30 text-amber-50" : "hover:bg-gray-900/50"
                    }`}
                  >
                    <td className="p-3 font-semibold">{w.id}</td>
                    <td className="p-3 truncate max-w-[120px]">{w.location}</td>
                    <td className="p-3 capitalize">{w.type}</td>
                    <td className="p-3 text-right">{formatNumber(w.capacity_pallets)}</td>
                    <td className="p-3 text-right">
                      <span className={(w.utilization_pct || 0) > 0.85 ? 'text-amber-500' : 'text-gray-300'}>
                        {formatPercent(w.utilization_pct || 0)}
                      </span>
                    </td>
                    <td className="p-3 text-right">{w.dock_count}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                        w.status === "Active" ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-400"
                      }`}>
                        {w.status || "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Pane Split */}
        <div className="w-2/5 flex flex-col">
          {/* Top Map */}
          <div className="h-[60%] relative border-b border-gray-800">
            <SCMMap
              nodes={mapNodes}
              selectedNodeId={selectedWhId || undefined}
              onNodeSelect={(n) => setSelectedWhId(n.id)}
              layers={{ warehouses: true }}
            />
          </div>

          {/* Bottom Detail */}
          <div className="h-[40%] bg-gray-950 p-4 overflow-y-auto">
            {!selectedWh ? (
              <div className="h-full flex items-center justify-center text-gray-600">Select a warehouse to view details</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">{selectedWh.name || selectedWh.id}</h2>
                  <div className="text-xs text-gray-500">{selectedWh.location} • {selectedWh.type}</div>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs text-gray-400 uppercase tracking-widest">Utilization</span>
                    <span className="text-xl font-bold text-white">{formatPercent(selectedWh.utilization_pct || 0)}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden mb-1">
                    <div 
                      className={`h-full ${(selectedWh.utilization_pct || 0) > 0.85 ? 'bg-amber-500' : 'bg-blue-500'}`} 
                      style={{ width: `${(selectedWh.utilization_pct || 0) * 100}%` }} 
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>0</span>
                    <span>{formatNumber(selectedWh.capacity_pallets)} PLT MAX</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-900 p-3 rounded border border-gray-800">
                    <div className="text-xs text-gray-500 mb-1">Op Cost / Pallet</div>
                    <div className="text-sm font-semibold text-white">{formatCurrency(selectedWh.operating_cost_per_pallet || 0, "INR")}</div>
                  </div>
                  <div className="bg-gray-900 p-3 rounded border border-gray-800">
                    <div className="text-xs text-gray-500 mb-1">Docks</div>
                    <div className="text-sm font-semibold text-white">{selectedWh.dock_count} Total</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
