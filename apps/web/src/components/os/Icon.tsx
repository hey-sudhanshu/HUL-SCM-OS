import {
  Network,
  Package,
  Warehouse,
  Factory,
  Truck,
  Route,
  ShieldAlert,
  ClipboardCheck,
  MapPin,
  Send,
  Cpu,
  Settings,
  Search,
  Folder,
  LayoutGrid
} from 'lucide-react';
import React from 'react';

export const ICONS = {
  network: Network,
  inventory: Package,
  warehouse: Warehouse,
  vendor: Factory,
  freight: Truck,
  route: Route,
  risk: ShieldAlert,
  governance: ClipboardCheck,
  tactical: MapPin,
  dispatch: Send,
  orion: Cpu,
  settings: Settings,
  search: Search,
  folder: Folder,
  app: LayoutGrid
};

export type AppIconId = keyof typeof ICONS;

export function getAppIcon(id: string) {
  const IconComponent = ICONS[id as AppIconId] || LayoutGrid;
  return IconComponent;
}
