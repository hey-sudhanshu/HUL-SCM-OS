import React, { useEffect, useState, useMemo } from 'react';
import { fetchNetworkData } from '@/lib/api';
import { useMapStore } from '@/store';
import { SCMMap } from '../../ui/SCMMap';
import { Marker, Source, Layer } from 'react-map-gl/maplibre';

export function TacticalMap() {
  const [network, setNetwork] = useState<any>(null);
  const { selectedTruckId, hoveredNodeId, setHoveredNodeId, selectedNodeId, setSelectedNodeId } = useMapStore();
  
  useEffect(() => {
    fetchNetworkData().then(setNetwork);
  }, []);

  if (!network) return <div className="p-4 font-mono">Loading Tactical Network...</div>;

  const nodes = [...(network.plants || []), ...(network.warehouses || []), ...(network.distributors || [])];
  
  const buildFeatures = () => {
    const features: any[] = [];
    if (!network.lanes) return { type: 'FeatureCollection', features };
    
    network.lanes.forEach((l: any) => {
        const src = nodes.find(n => n.id === l.source_id);
        const dst = nodes.find(n => n.id === l.dest_id);
        if (src && dst && src.coordinates && dst.coordinates) {
            features.push({
                type: 'Feature',
                properties: {
                    color: l.actual_transit_mean > l.planned_transit_hours ? '#ff4d4f' : '#1B998B',
                    weight: l.planned_transit_hours > 24 ? 2 : 1
                },
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [src.coordinates[1], src.coordinates[0]],
                        [dst.coordinates[1], dst.coordinates[0]]
                    ]
                }
            });
        }
    });
    return { type: 'FeatureCollection', features };
  };

  const lineLayer = {
    id: 'network-lines',
    type: 'line',
    paint: {
        'line-color': ['get', 'color'],
        'line-width': ['get', 'weight'],
        'line-opacity': 0.6
    }
  } as any;

  const selectedNodeData = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;

  return (
    <div className="flex h-full bg-sys-gray font-mono text-xs overflow-hidden">
      <div className="flex-1 relative border-r-2 border-sys-black">
        <SCMMap initialViewState={{ longitude: 79.0, latitude: 21.0, zoom: 4.5 }}>
            <Source id="lanes" type="geojson" data={buildFeatures() as any}>
                <Layer {...lineLayer} />
            </Source>
            {nodes.map(n => {
                if(!n.coordinates) return null;
                const isHovered = hoveredNodeId === n.id;
                const isSelected = selectedNodeId === n.id;
                return (
                    <Marker key={n.id} longitude={n.coordinates[1]} latitude={n.coordinates[0]}>
                        <div 
                          onMouseEnter={() => setHoveredNodeId(n.id)}
                          onMouseLeave={() => setHoveredNodeId(null)}
                          onClick={() => setSelectedNodeId(n.id)}
                          className={`w-3 h-3 rounded-full border border-sys-black cursor-pointer shadow-md transition-all ${
                              isSelected ? 'bg-yellow-400 scale-150 z-50' : 
                              isHovered ? 'bg-[var(--sys-teal)] scale-125 z-40' : 
                              'bg-white z-10'
                          }`}
                        />
                    </Marker>
                );
            })}
        </SCMMap>
      </div>

      <div className="w-80 bg-white flex flex-col shadow-[-4px_0_15px_rgba(0,0,0,0.1)] z-10 shrink-0">
          <div className="bg-[var(--sys-teal)] text-white px-3 py-2 font-bold text-sm border-b border-sys-black">
              Tactical Inspector
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
              {!selectedNodeData ? (
                  <div className="text-gray-500 text-center mt-10">Select a node on the map to inspect.</div>
              ) : (
                  <div className="space-y-4">
                      <div>
                          <div className="font-bold text-lg mb-1">{selectedNodeData.name || selectedNodeData.cluster_name}</div>
                          <div className="text-[10px] text-gray-500 uppercase">{selectedNodeData.type || 'Distributor'} | {selectedNodeData.id}</div>
                      </div>
                      
                      <div className="border border-sys-black bg-gray-50 p-2">
                          <div className="font-bold border-b border-gray-300 pb-1 mb-2">Node Parameters</div>
                          <div className="flex justify-between mb-1"><span>Operating Cost:</span> <span>₹{selectedNodeData.operating_cost_per_pallet || selectedNodeData.handling_cost_per_pallet || 0} / plt</span></div>
                          <div className="flex justify-between mb-1"><span>Capacity:</span> <span>{selectedNodeData.capacity_pallets ? `${selectedNodeData.capacity_pallets} plt` : 'N/A'}</span></div>
                          <div className="flex justify-between"><span>Status:</span> <span>{selectedNodeData.status || 'active'}</span></div>
                      </div>

                      {selectedNodeData.type === 'warehouse' && (
                          <div className="border border-sys-black bg-gray-50 p-2">
                              <div className="font-bold border-b border-gray-300 pb-1 mb-2">Utilization</div>
                              <div className="w-full bg-gray-200 h-4 border border-sys-black relative">
                                  <div className="h-full bg-green-500" style={{ width: `${(selectedNodeData.utilization_pct || 0) * 100}%` }}></div>
                                  <div className="absolute inset-0 flex items-center justify-center font-bold text-[10px] mix-blend-difference text-white">
                                      {((selectedNodeData.utilization_pct || 0) * 100).toFixed(1)}%
                                  </div>
                              </div>
                          </div>
                      )}
                      
                      <button className="w-full mt-4 bg-[var(--sys-teal)] text-white py-2 font-bold border border-sys-black hover:brightness-110 shadow-sm transition-all" onClick={() => alert("Simulation launched")}>
                          Simulate Throughput
                      </button>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}
