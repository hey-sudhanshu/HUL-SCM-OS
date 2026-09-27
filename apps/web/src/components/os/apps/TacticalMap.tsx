"use client";

import React, { useEffect, useState, useMemo } from "react";
import { MapPin, Layers, X, Activity } from "lucide-react";
import SCMMap, { MapNode, MapRoute } from "@/components/map/SCMMap";
import { formatNumber, formatPercent } from "@/lib/format";

const fetchNetworkData = async () => {
  try {
    const res = await fetch("/precomputed/network.json");
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
};

export default function TacticalMap() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  
  const [layers, setLayers] = useState({
    plants: true,
    warehouses: true,
    distributors: true,
    primaryLanes: false,
    riskNodes: false,
  });

  useEffect(() => {
    fetchNetworkData().then((d) => {
      if (d) setData(d);
      setLoading(false);
    });
  }, []);

  const counts = useMemo(() => {
    if (!data) return { p: 0, w: 0, d: 0 };
    return {
      p: data.plants?.length || 0,
      w: data.warehouses?.length || 0,
      d: data.distributors?.length || 0
    };
  }, [data]);

  const mapNodes = useMemo<MapNode[]>(() => {
    if (!data) return [];
    const p = (data.plants || []).map((n: any) => ({ ...n, type: "plant" }));
    const w = (data.warehouses || []).map((n: any) => ({ ...n, type: n.type || "warehouse" }));
    const d = (data.distributors || []).map((n: any) => ({ ...n, type: "distributor" }));
    return [...p, ...w, ...d];
  }, [data]);

  const mapRoutes = useMemo<MapRoute[]>(() => {
    if (!data || !layers.primaryLanes) return [];
    const nodeMap = new Map<string, [number, number]>();
    mapNodes.forEach(n => nodeMap.set(n.id, n.coordinates));

    // Get top 200 lanes by volume or just first 200
    const lanes = (data.lanes || []).slice(0, 200);

    return lanes.map((lane: any, idx: number) => {
      const start = nodeMap.get(lane.source_id);
      const end = nodeMap.get(lane.dest_id);
      if (!start || !end) return null;
      return {
        id: `lane-${idx}`,
        coordinates: [start, end],
        color: "rgba(59, 130, 246, 0.4)",
      };
    }).filter(Boolean) as MapRoute[];
  }, [data, layers.primaryLanes, mapNodes]);

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return <div className="p-8 text-white font-mono flex items-center justify-center h-full bg-black">INITIALIZING TACTICAL MAP...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-black text-gray-200 font-mono text-sm relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <MapPin className="text-white" />
        <h1 className="text-xl font-bold tracking-widest text-white shadow-black drop-shadow-md">TACTICAL MAP</h1>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        <SCMMap
          nodes={mapNodes}
          routes={mapRoutes}
          selectedNodeId={selectedNode?.id}
          onNodeSelect={(n) => setSelectedNode(n)}
          layers={{
            plants: layers.plants,
            warehouses: layers.warehouses,
            distributors: layers.distributors,
          }}
        />

        {/* Top Right Controls */}
        <div className="absolute top-4 right-4 z-10 bg-black/80 backdrop-blur-md border border-gray-800 rounded-lg p-4 w-64 shadow-2xl">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
            <Layers size={16} className="text-gray-400" />
            <h3 className="text-white font-bold tracking-wider">LAYERS</h3>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={layers.plants} onChange={() => toggleLayer('plants')} className="bg-gray-900 border-gray-600 rounded" />
              <span className="flex-1 text-gray-300">Plants</span>
              <span className="text-xs text-gray-500 font-bold">{counts.p}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={layers.warehouses} onChange={() => toggleLayer('warehouses')} className="bg-gray-900 border-gray-600 rounded" />
              <span className="flex-1 text-gray-300">Warehouses</span>
              <span className="text-xs text-gray-500 font-bold">{counts.w}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={layers.distributors} onChange={() => toggleLayer('distributors')} className="bg-gray-900 border-gray-600 rounded" />
              <span className="flex-1 text-gray-300">Distributors</span>
              <span className="text-xs text-gray-500 font-bold">{counts.d}</span>
            </label>
            <div className="h-px bg-gray-800 my-2" />
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={layers.primaryLanes} onChange={() => toggleLayer('primaryLanes')} className="bg-gray-900 border-gray-600 rounded" />
              <span className="text-gray-300">Primary Lanes</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer opacity-50">
              <input type="checkbox" checked={layers.riskNodes} onChange={() => toggleLayer('riskNodes')} className="bg-gray-900 border-gray-600 rounded" disabled />
              <span className="text-gray-300">Risk Nodes</span>
            </label>
          </div>
        </div>

        {/* Bottom Left Legend */}
        <div className="absolute bottom-6 left-4 z-10 bg-black/80 backdrop-blur-md border border-gray-800 rounded-lg p-3 shadow-2xl flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
            <span className="text-xs text-gray-400">Plant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
            <span className="text-xs text-gray-400">Warehouse</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-teal-400 rounded-full"></div>
            <span className="text-xs text-gray-400">Distributor</span>
          </div>
        </div>

        {/* Detail Panel Sliding In */}
        {selectedNode && (
          <div className="absolute top-4 bottom-4 right-[280px] z-10 w-80 bg-black/90 backdrop-blur-xl border border-gray-700 rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-200">
            <div className="flex justify-between items-start p-4 border-b border-gray-800 bg-gray-900/50">
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{selectedNode.type}</div>
                <h2 className="text-lg font-bold text-white leading-tight">{selectedNode.name || selectedNode.cluster_name || selectedNode.id}</h2>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-gray-500 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-gray-500 mb-1">ID</div>
                  <div className="text-gray-200">{selectedNode.id}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Location</div>
                  <div className="text-gray-200">{selectedNode.location || selectedNode.cluster_name || "N/A"}</div>
                </div>
              </div>

              {selectedNode.type?.includes("warehouse") && (
                <div className="bg-gray-900 rounded p-3 border border-gray-800 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Utilization</span>
                      <span className="text-white font-bold">{formatPercent(selectedNode.utilization_pct || 0)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-800 rounded overflow-hidden">
                      <div className={`h-full ${(selectedNode.utilization_pct || 0) > 0.85 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${(selectedNode.utilization_pct || 0) * 100}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500 block mb-0.5">Capacity</span>
                      <span className="text-gray-200">{formatNumber(selectedNode.capacity_pallets || 0)} PLT</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">Docks</span>
                      <span className="text-gray-200">{selectedNode.dock_count || "-"}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-900 rounded p-3 border border-gray-800">
                <div className="text-gray-500 text-xs mb-1">Coordinates</div>
                <div className="text-gray-300 text-xs font-mono">
                  [{selectedNode.coordinates[0].toFixed(4)}, {selectedNode.coordinates[1].toFixed(4)}]
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
