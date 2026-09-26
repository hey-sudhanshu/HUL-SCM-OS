'use client';
import { useMemo, useState } from 'react';
import Map, { Marker, NavigationControl, Source, Layer, Popup } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { PixelIcon } from '../os/Icon';

interface SCMMapProps {
  nodes?: any[];
  routes?: any[];
  selectedNodeId?: string;
  onNodeSelect?: (node: any) => void;
  interactive?: boolean;
  viewState?: any;
}

export function SCMMap({ nodes = [], routes = [], selectedNodeId, onNodeSelect, interactive = true, viewState: initialViewState }: SCMMapProps) {
  const [hoverInfo, setHoverInfo] = useState<any>(null);

  const routeGeoJSON = useMemo(() => {
    if (!routes || routes.length === 0) return null;
    return {
      type: 'FeatureCollection',
      features: routes.map((r, i) => ({
        type: 'Feature',
        properties: { id: r.id || i, color: r.color || 'var(--sys-teal)' },
        geometry: {
          type: 'LineString',
          coordinates: r.coordinates || []
        }
      }))
    };
  }, [routes]);

  return (
    <div className="w-full h-full relative bg-[#e5e9ec]">
      <Map
        initialViewState={initialViewState || {
          longitude: 78.9629,
          latitude: 20.5937,
          zoom: 3.5
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        interactive={interactive}
        scrollZoom={interactive}
        dragPan={interactive}
      >
        {interactive && <NavigationControl position="bottom-right" showCompass={false} />}

        {routeGeoJSON && (
          <Source id="routes" type="geojson" data={routeGeoJSON as any}>
            <Layer
              id="route-lines"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 3,
                'line-opacity': 0.8
              }}
            />
          </Source>
        )}

        {nodes.map(node => (
          <Marker
            key={node.id}
            longitude={node.lon || node.longitude}
            latitude={node.lat || node.latitude}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onNodeSelect?.(node);
            }}
          >
            <div 
              className={`w-4 h-4 rounded-full border-2 border-white cursor-pointer transition-all shadow-sm
                ${selectedNodeId === node.id ? 'scale-150 ring-2 ring-[var(--sys-amber)] z-20' : 'hover:scale-125 z-10'}
                ${node.type === 'Plant' ? 'bg-blue-600 rounded-sm' : node.type === 'CFA' ? 'bg-purple-500' : node.type === 'Supplier' ? 'bg-amber-600' : 'bg-[var(--sys-teal)]'}
              `}
              onMouseEnter={() => setHoverInfo(node)}
              onMouseLeave={() => setHoverInfo(null)}
            />
          </Marker>
        ))}

        {hoverInfo && (
          <Popup
            longitude={hoverInfo.lon || hoverInfo.longitude}
            latitude={hoverInfo.lat || hoverInfo.latitude}
            closeButton={false}
            closeOnClick={false}
            anchor="bottom"
            offset={12}
            className="z-50"
          >
            <div className="p-2 text-xs font-sans text-sys-black shadow-lg">
              <div className="font-bold border-b border-black/10 pb-1 mb-1">{hoverInfo.id}</div>
              <div className="opacity-80">{hoverInfo.type || hoverInfo.role}</div>
              {hoverInfo.location && <div className="text-black/60">{hoverInfo.location}</div>}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
