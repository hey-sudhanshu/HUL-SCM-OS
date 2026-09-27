"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Network, Activity, MapPin, Search } from "lucide-react";
import SCMMap, { MapNode, MapRoute } from "@/components/map/SCMMap";
import { formatNumber } from "@/lib/format";

// Mock fetch function, assuming it's available in the real project context
const fetchNetworkData = async () => {
  try {
    const res = await fetch("/precomputed/network.json");
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
};

export default function NetworkBrowser() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"plants" | "warehouses" | "distributors">("plants");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showLanes, setShowLanes] = useState(false);

  useEffect(() => {
    fetchNetworkData().then((d) => {
      if (d) setData(d);
      setLoading(false);
    });
  }, []);

  const kpis = useMemo(() => {
    if (!data) return { totalNodes: 0, activeLanes: 0, networkCapacity: 0, avgDelay: 0 };
    const totalNodes = (data.plants?.length || 0) + (data.warehouses?.length || 0) + (data.distributors?.length || 0);
    const activeLanes = data.lanes?.length || 0;
    const networkCapacity = (data.warehouses || []).reduce((acc: number, w: any) => acc + (w.capacity_pallets || 0), 0);
    
    let delaySum = 0;
    let delayCount = 0;
    (data.lanes || []).forEach((l: any) => {
      if (l.actual_transit_mean && l.planned_transit_hours) {
        delaySum += (l.actual_transit_mean - l.planned_transit_hours);
        delayCount++;
      }
    });
    const avgDelay = delayCount > 0 ? (delaySum / delayCount) : 0;

    return { totalNodes, activeLanes, networkCapacity, avgDelay };
  }, [data]);

  const mapNodes = useMemo<MapNode[]>(() => {
    if (!data) return [];
    const p = (data.plants || []).map((n: any) => ({ ...n, type: "plant" }));
    const w = (data.warehouses || []).map((n: any) => ({ ...n, type: n.type || "warehouse" }));
    const d = (data.distributors || []).map((n: any) => ({ ...n, type: "distributor" }));
    return [...p, ...w, ...d];
  }, [data]);

  const mapRoutes = useMemo<MapRoute[]>(() => {
    if (!data || !showLanes) return [];
    const nodeMap = new Map<string, [number, number]>();
    mapNodes.forEach(n => nodeMap.set(n.id, n.coordinates));

    return (data.lanes || []).map((lane: any, idx: number) => {
      const start = nodeMap.get(lane.source_id);
      const end = nodeMap.get(lane.dest_id);
      if (!start || !end) return null;
      return {
        id: `lane-${idx}`,
        coordinates: [start, end],
        color: lane.source_id === selectedNodeId || lane.dest_id === selectedNodeId ? "#3b82f6" : "#4b5563",
        selected: lane.source_id === selectedNodeId || lane.dest_id === selectedNodeId,
      };
    }).filter(Boolean) as MapRoute[];
  }, [data, showLanes, selectedNodeId, mapNodes]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return mapNodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, mapNodes]);

  const connectedLanes = useMemo(() => {
    if (!selectedNodeId || !data) return [];
    return (data.lanes || []).filter((l: any) => l.source_id === selectedNodeId || l.dest_id === selectedNodeId);
  }, [selectedNodeId, data]);

  if (loading) {
    return <div className="p-8 text-white font-mono flex items-center justify-center h-full">LOADING NETWORK DATA...</div>;
  }

  const listData = data ? (data[activeTab] || []) : [];

  return (
    <div className="flex flex-col h-full bg-black text-gray-200 font-mono text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-800 bg-gray-950">
        <Network className="text-blue-500" />
        <h1 className="text-xl font-bold tracking-tight text-white">NETWORK BROWSER</h1>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-800 bg-gray-900/50">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Total Nodes</span>
          <span className="text-lg font-semibold text-white">{formatNumber(kpis.totalNodes)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Active Lanes</span>
          <span className="text-lg font-semibold text-white">{formatNumber(kpis.activeLanes)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Network Capacity</span>
          <span className="text-lg font-semibold text-white">{formatNumber(kpis.networkCapacity)} PLT</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Avg Transit Delay</span>
          <span className="text-lg font-semibold text-amber-400">+{kpis.avgDelay.toFixed(1)} hrs</span>
        </div>
      </div>

      {/* Main Split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left List */}
        <div className="w-1/4 flex flex-col border-r border-gray-800 bg-gray-950">
          <div className="flex border-b border-gray-800">
            {["plants", "warehouses", "distributors"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-2 text-xs font-semibold capitalize ${
                  activeTab === tab ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {listData.map((item: any) => (
              <div
                key={item.id}
                onClick={() => setSelectedNodeId(item.id)}
                className={`p-2 rounded cursor-pointer border ${
                  selectedNodeId === item.id
                    ? "bg-blue-900/30 border-blue-500/50 text-white"
                    : "border-transparent hover:bg-gray-800/50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="font-bold truncate" title={item.name || item.cluster_name}>{item.name || item.cluster_name || item.id}</div>
                  <div className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 capitalize whitespace-nowrap">
                    {item.type || (activeTab === "plants" ? "plant" : "distributor")}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <MapPin size={10} />
                  {item.location || item.cluster_name || "Unknown Location"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Map */}
        <div className="flex-1 relative">
          <div className="absolute top-4 left-4 z-10 bg-gray-900/80 p-2 rounded border border-gray-700 shadow flex items-center gap-2">
            <input 
              type="checkbox" 
              id="showLanes" 
              checked={showLanes} 
              onChange={(e) => setShowLanes(e.target.checked)}
              className="rounded bg-gray-800 border-gray-600 text-blue-500"
            />
            <label htmlFor="showLanes" className="text-xs text-white cursor-pointer select-none">Show Lanes</label>
          </div>
          <SCMMap
            nodes={mapNodes}
            routes={mapRoutes}
            selectedNodeId={selectedNodeId || undefined}
            onNodeSelect={(n) => setSelectedNodeId(n.id)}
            layers={{
              plants: true,
              warehouses: true,
              distributors: true
            }}
          />
        </div>

        {/* Right Detail */}
        {selectedNode && (
          <div className="w-72 border-l border-gray-800 bg-gray-950 flex flex-col">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white mb-1">{selectedNode.name || selectedNode.cluster_name || selectedNode.id}</h2>
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                <span className="capitalize px-1.5 py-0.5 bg-gray-800 rounded">{selectedNode.type}</span>
                <span>{selectedNode.location || selectedNode.cluster_name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-900 p-2 rounded border border-gray-800">
                  <div className="text-gray-500 mb-1">ID</div>
                  <div className="text-white truncate" title={selectedNode.id}>{selectedNode.id}</div>
                </div>
                <div className="bg-gray-900 p-2 rounded border border-gray-800">
                  <div className="text-gray-500 mb-1">Coordinates</div>
                  <div className="text-white text-[10px]">
                    {selectedNode.coordinates[0].toFixed(2)}, {selectedNode.coordinates[1].toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Connected Lanes ({connectedLanes.length})</h3>
              <div className="space-y-2">
                {connectedLanes.slice(0, 15).map((l: any, i: number) => {
                  const isSource = l.source_id === selectedNode.id;
                  const partnerId = isSource ? l.dest_id : l.source_id;
                  return (
                    <div key={i} className="text-xs bg-gray-900 p-2 rounded border border-gray-800">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300 truncate" title={partnerId}>{partnerId}</span>
                        <span className={`text-[10px] px-1 rounded ${isSource ? 'bg-blue-900/50 text-blue-400' : 'bg-amber-900/50 text-amber-400'}`}>
                          {isSource ? 'OUT' : 'IN'}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>{l.distance_km} km</span>
                        <span>{l.planned_transit_hours}h</span>
                      </div>
                    </div>
                  );
                })}
                {connectedLanes.length > 15 && (
                  <div className="text-center text-xs text-gray-500 pt-2">+ {connectedLanes.length - 15} more</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
