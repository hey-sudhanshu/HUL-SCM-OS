import React from 'react';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface SCMMapProps {
  children?: React.ReactNode;
  initialViewState?: { longitude: number; latitude: number; zoom: number };
}

export function SCMMap({ 
  children, 
  initialViewState = { longitude: 77.5, latitude: 20.5, zoom: 4 }
}: SCMMapProps) {
  return (
    <Map
      initialViewState={initialViewState}
      mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="top-right" />
      {children}
    </Map>
  );
}
