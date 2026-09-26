'use client';
import { Folder, Square, Info, Trash2, Database, Map, Box, Truck, Calculator, Archive, Users, AlertTriangle, Shield, Terminal } from 'lucide-react';

export function PixelIcon({ type, className }: { type: string, className?: string }) {
  const IconProps = { className, strokeWidth: 1.5 };
  switch (type) {
    case 'folder': return <Folder {...IconProps} />;
    case 'app': return <Square {...IconProps} />;
    case 'info': return <Info {...IconProps} />;
    case 'trash': return <Trash2 {...IconProps} />;
    case 'database': return <Database {...IconProps} />;
    case 'map': return <Map {...IconProps} />;
    case 'box': return <Box {...IconProps} />;
    case 'truck': return <Truck {...IconProps} />;
    case 'calculator': return <Calculator {...IconProps} />;
    case 'archive': return <Archive {...IconProps} />;
    case 'users': return <Users {...IconProps} />;
    case 'alert': return <AlertTriangle {...IconProps} />;
    case 'shield': return <Shield {...IconProps} />;
    case 'terminal': return <Terminal {...IconProps} />;
    default: return <div className={`border-2 border-current ${className}`} />;
  }
}
