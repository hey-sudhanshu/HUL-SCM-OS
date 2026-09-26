import React, { useState, useEffect } from 'react';
import { fetchNetworkData } from '@/lib/api';
import { SCMMap } from '../../ui/SCMMap';
import { Marker } from 'react-map-gl/maplibre';
import { SCMKpiStrip } from '../../ui/SCMKpiStrip';

export function NetworkBrowser() {
  const [data, setData] = useState<any>(null);
  const [selectedFacilityType, setSelectedFacilityType] = useState<string | null>('Warehousing');
  const [selectedFacility, setSelectedFacility] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>('Home Care');
  const [selectedSKU, setSelectedSKU] = useState<any>(null);

  useEffect(() => {
    fetchNetworkData().then(d => {
      setData(d);
      const wh = d.warehouses.find((w: any) => w.id === 'WH-PUN');
      if (wh) setSelectedFacility(wh);
      const sku = d.skus.find((s: any) => s.category === 'Home Care');
      if (sku) setSelectedSKU(sku);
    });
  }, []);

  if (!data) return <div className="p-4 font-mono text-xs">Loading network data...</div>;

  const facilities = data.warehouses;
  const categories = Array.from(new Set(data.skus.map((s: any) => s.category)));
  const skusInCat = data.skus.filter((s: any) => s.category === selectedCategory);
  const lanes = selectedFacility ? data.lanes.filter((l: any) => l.source_id === selectedFacility.id) : [];

  return (
    <div className="flex flex-col h-full bg-white font-mono text-xs overflow-hidden">
      {/* KPI Strip */}
      <div className="p-2 bg-gray-100 border-b border-sys-black">
        <SCMKpiStrip items={[
            { label: 'Total Nodes', value: (data.warehouses?.length || 0) + (data.plants?.length || 0) + (data.distributors?.length || 0) },
            { label: 'Total SKUs', value: data.skus?.length || 0 },
            { label: 'Active Lanes', value: data.lanes?.length || 0 },
        ]} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map Column */}
        <div className="flex-1 border-r border-sys-black relative">
            <SCMMap initialViewState={{ longitude: 79.0, latitude: 21.0, zoom: 4 }}>
                {selectedFacility && selectedFacility.coordinates && (
                    <Marker longitude={selectedFacility.coordinates[1]} latitude={selectedFacility.coordinates[0]}>
                        <div className="w-4 h-4 bg-[var(--sys-teal)] rotate-45 border-2 border-white shadow-md animate-pulse"></div>
                    </Marker>
                )}
                {lanes.slice(0, 10).map((l:any) => {
                    const dest = data.distributors.find((d:any) => d.id === l.dest_id);
                    if(!dest || !dest.coordinates) return null;
                    return (
                        <Marker key={l.dest_id} longitude={dest.coordinates[1]} latitude={dest.coordinates[0]}>
                            <div className="w-2 h-2 bg-yellow-400 rounded-full border border-sys-black" title={dest.id}></div>
                        </Marker>
                    )
                })}
            </SCMMap>
            <div className="absolute top-2 left-2 bg-white/90 border border-sys-black p-2 font-bold shadow-sm backdrop-blur-sm z-10">Network Map</div>
        </div>

        {/* Miller Columns Container */}
        <div className="flex w-[800px] overflow-x-auto bg-gray-50 shrink-0">
            {/* Col 1: Level 1 (HUL Network) */}
            <div className="w-48 border-r border-sys-black flex-shrink-0 flex flex-col bg-white">
            <div className="bg-gray-200 border-b border-sys-black p-2 font-bold">HUL Network</div>
            <div className="overflow-y-auto flex-1">
                <div 
                className={`p-2 cursor-pointer hover:bg-black hover:text-white ${selectedFacilityType === 'Warehousing' ? 'bg-black text-white' : ''}`}
                onClick={() => setSelectedFacilityType('Warehousing')}
                >
                ▶ Warehousing
                </div>
                <div className="p-2 text-gray-400">▶ Manufacturing (Plants)</div>
                <div className="p-2 text-gray-400">▶ Suppliers</div>
            </div>
            </div>

            {/* Col 2: Facilities */}
            {selectedFacilityType === 'Warehousing' && (
            <div className="w-56 border-r border-sys-black flex-shrink-0 flex flex-col bg-white">
                <div className="bg-gray-200 border-b border-sys-black p-2 font-bold">Facilities</div>
                <div className="overflow-y-auto flex-1">
                {facilities.map((f: any) => (
                    <div 
                    key={f.id}
                    className={`p-2 cursor-pointer hover:bg-black hover:text-white border-b border-gray-100 ${selectedFacility?.id === f.id ? 'bg-black text-white' : ''}`}
                    onClick={() => setSelectedFacility(f)}
                    >
                    <div>▶ {f.name}</div>
                    <div className="text-[10px] opacity-70">{f.id} | Cap: {f.capacity_pallets || 'N/A'}</div>
                    </div>
                ))}
                </div>
            </div>
            )}

            {/* Col 3: Categories */}
            {selectedFacility && (
            <div className="w-48 border-r border-sys-black flex-shrink-0 flex flex-col bg-white">
                <div className="bg-gray-200 border-b border-sys-black p-2 font-bold">Categories</div>
                <div className="overflow-y-auto flex-1">
                {categories.map((c: any) => (
                    <div 
                    key={c}
                    className={`p-2 cursor-pointer hover:bg-black hover:text-white border-b border-gray-100 ${selectedCategory === c ? 'bg-black text-white' : ''}`}
                    onClick={() => setSelectedCategory(c)}
                    >
                    ▶ {c}
                    </div>
                ))}
                </div>
            </div>
            )}

            {/* Col 4: SKUs */}
            {selectedCategory && (
            <div className="w-64 border-r border-sys-black flex-shrink-0 flex flex-col bg-white">
                <div className="bg-gray-200 border-b border-sys-black p-2 font-bold">SKUs</div>
                <div className="overflow-y-auto flex-1">
                {skusInCat.map((s: any) => (
                    <div 
                    key={s.id}
                    className={`p-2 cursor-pointer hover:bg-black hover:text-white border-b border-gray-100 ${selectedSKU?.id === s.id ? 'bg-[var(--sys-teal)] text-white' : ''}`}
                    onClick={() => setSelectedSKU(s)}
                    >
                    <div className="font-bold">{s.id}</div>
                    <div className="text-[10px] opacity-90">{s.brand} {s.pack}</div>
                    </div>
                ))}
                </div>
            </div>
            )}

            {/* Col 5: Lanes Details */}
            {selectedSKU && (
            <div className="w-64 flex-shrink-0 flex flex-col bg-white">
                <div className="bg-gray-200 border-b border-sys-black p-2 font-bold">Details</div>
                <div className="overflow-y-auto p-3 flex-1 space-y-4">
                <div className="border border-sys-black p-3 bg-gray-50 shadow-[2px_2px_0_var(--sys-black)]">
                    <strong className="text-sm block mb-1 text-[var(--sys-teal)]">{selectedSKU.brand} {selectedSKU.pack}</strong>
                    <div className="flex justify-between border-b border-gray-200 py-1"><span>Weight:</span> <span>{selectedSKU.weight_kg} kg</span></div>
                    <div className="flex justify-between border-b border-gray-200 py-1"><span>Cost:</span> <span>₹{selectedSKU.unit_cost}</span></div>
                    <div className="flex justify-between py-1"><span>Class:</span> <span className="bg-[var(--sys-amber)] px-1">{selectedSKU.velocity_class}</span></div>
                </div>
                <div>
                    <div className="font-bold border-b border-sys-black pb-1 mt-2 mb-2">Active Lanes from {selectedFacility.id}</div>
                    {lanes.length === 0 && <div className="text-gray-500 italic">No lanes found</div>}
                    {lanes.slice(0, 5).map((l: any, i: number) => (
                    <div key={i} className="text-[10px] border border-sys-black p-2 mb-2 bg-gray-50">
                        <div className="font-bold mb-1">To: {l.dest_id}</div>
                        <div className="flex justify-between"><span>Dist:</span> <span>{l.distance_km}km</span></div>
                        <div className="flex justify-between"><span>Cost:</span> <span>₹{l.cost_per_trip}</span></div>
                        <div className="flex justify-between"><span>Mean Transit:</span> <span>{l.actual_transit_mean}h</span></div>
                        {l.monsoon_vulnerable && <div className="text-red-600 font-bold mt-1 bg-red-100 p-1 text-center uppercase">[Monsoon Risk]</div>}
                    </div>
                    ))}
                    {lanes.length > 5 && <div className="text-[var(--sys-teal)] font-bold text-center border border-[var(--sys-teal)] p-1 hover:bg-[var(--sys-teal)] hover:text-white cursor-pointer transition-colors">+ {lanes.length - 5} more lanes</div>}
                </div>
                </div>
            </div>
            )}
        </div>
      </div>
    </div>
  );
}
