import React from 'react';

export function SCMKpiStrip({ items }: { items: { label: string; value: string | number; trend?: 'up'|'down'|'neutral'; color?: string }[] }) {
  return (
    <div className="flex gap-4 shrink-0 overflow-x-auto pb-2">
      {items.map((item, i) => (
        <div key={i} className="flex-1 bg-white border border-sys-black p-3 shadow-sm flex flex-col min-w-[120px]">
          <div className="text-xs font-bold text-gray-500 mb-1">{item.label}</div>
          <div className="text-xl font-mono font-bold" style={{ color: item.color || 'inherit' }}>
            {item.value}
            {item.trend === 'up' && <span className="text-green-500 ml-1 text-sm">↑</span>}
            {item.trend === 'down' && <span className="text-red-500 ml-1 text-sm">↓</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
