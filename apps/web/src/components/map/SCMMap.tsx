"use client";

import React, { useMemo, useState } from "react";
import Map, { NavigationControl, Marker, Source, Layer, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin } from "lucide-react";

export interface MapNode {
  id: string;
  coordinates: [number, number];
  type?: string;
  name?: string;
  [key: string]: any;
}

export interface MapRoute {
  id: string;
  coordinates: [number, number][];
  color?: string;
  selected?: boolean;
}

interface SCMMapProps {
  nodes?: MapNode[];
  routes?: MapRoute[];
  selectedNodeId?: string;
  onNodeSelect?: (node: MapNode) => void;
  layers?: Record<string, boolean>;
  height?: string;
  interactive?: boolean;
}

export default function SCMMap({
  nodes = [],
  routes = [],
  selectedNodeId,
  onNodeSelect,
  layers,
  height = "100%",
  interactive = true,
}: SCMMapProps) {
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; node: MapNode } | null>(null);

  // Default basemap and view
  const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
  const INITIAL_VIEW_STATE = {
    longitude: 78.9629,
    latitude: 20.5937,
    zoom: 4,
    bearing: 0,
    pitch: 0,
  };

  // Filter nodes based on active layers
  const visibleNodes = useMemo(() => {
    if (!layers) return nodes;
    return nodes.filter((node) => {
      const type = (node.type || "unknown").toLowerCase();
      if (type.includes("plant") && layers["plants"] === false) return false;
      if ((type.includes("warehouse") || type.includes("cfa")) && layers["warehouses"] === false) return false;
      if (type.includes("distributor") && layers["distributors"] === false) return false;
      return true;
    });
  }, [nodes, layers]);

  // Construct GeoJSON for routes
  const routesGeoJSON = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: routes.map((route) => ({
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: route.coordinates,
        },
        properties: {
          id: route.id,
          color: route.selected ? "#10b981" : route.color || "#4b5563",
          width: route.selected ? 3 : 1,
          opacity: route.selected ? 1 : 0.5,
        },
      })),
    };
  }, [routes]);

  const getNodeColor = (type?: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("plant")) return "bg-blue-500";
    if (t.includes("warehouse") || t.includes("cfa")) return "bg-amber-500";
    if (t.includes("distributor")) return "bg-teal-400";
    return "bg-gray-500";
  };

  return (
    <div style={{ height, width: "100%" }} className="relative bg-black rounded-lg overflow-hidden border border-gray-800">
      <Map
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle={MAP_STYLE}
        interactive={interactive}
        attributionControl={false}
      >
        {interactive && <NavigationControl position="bottom-right" />}

        {/* Routes Layer */}
        {routes.length > 0 && (
          <Source id="routes-source" type="geojson" data={routesGeoJSON}>
            <Layer
              id="routes-layer"
              type="line"
              paint={{
                "line-color": ["get", "color"],
                "line-width": ["get", "width"],
                "line-opacity": ["get", "opacity"],
              }}
            />
          </Source>
        )}

        {/* Nodes Layer */}
        {visibleNodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const nodeColorClass = getNodeColor(node.type);
          const isPlant = (node.type || "").toLowerCase().includes("plant");

          return (
            <Marker
              key={node.id}
              longitude={node.coordinates[0]}
              latitude={node.coordinates[1]}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                if (onNodeSelect) onNodeSelect(node);
              }}
            >
              <div
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-125 z-10" : ""
                }`}
                onMouseEnter={(e) => {
                  setHoverInfo({ x: e.clientX, y: e.clientY, node });
                }}
                onMouseLeave={() => {
                  setHoverInfo(null);
                }}
              >
                <div
                  className={`
                    ${nodeColorClass} shadow-lg
                    ${isPlant ? "w-3 h-3 rounded-sm" : "w-2.5 h-2.5 rounded-full"}
                    ${isSelected ? "w-4 h-4 shadow-[0_0_10px_rgba(255,255,255,0.5)]" : ""}
                  `}
                />
              </div>
            </Marker>
          );
        })}

        {/* Hover Popup */}
        {hoverInfo && (
          <Popup
            longitude={hoverInfo.node.coordinates[0]}
            latitude={hoverInfo.node.coordinates[1]}
            closeButton={false}
            closeOnClick={false}
            anchor="bottom"
            offset={15}
            className="z-50"
            style={{ fontFamily: "monospace" }}
          >
            <div className="bg-gray-900 border border-gray-700 p-2 rounded shadow-xl text-xs font-mono text-gray-200 min-w-[120px]">
              <div className="font-bold text-white border-b border-gray-700 pb-1 mb-1">
                {hoverInfo.node.name || hoverInfo.node.cluster_name || hoverInfo.node.id}
              </div>
              <div className="text-gray-400">ID: {hoverInfo.node.id}</div>
              {hoverInfo.node.type && (
                <div className="text-gray-400 capitalize mt-1 flex items-center gap-1">
                  <MapPin size={10} />
                  {hoverInfo.node.type}
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
