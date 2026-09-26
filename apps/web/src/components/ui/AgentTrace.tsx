import React from 'react';

export function AgentTrace({ steps, status = 'waiting' }: { steps: string[], status?: 'running'|'waiting'|'done' }) {
  return (
    <div className="bg-gray-50 border border-sys-black/10 p-2 rounded-sm">
      <div className="text-[10px] text-gray-500 font-mono mb-1 border-b border-gray-200 pb-1">ORION EXECUTION TRACE</div>
      <div className="space-y-1.5 font-mono text-[10px] mt-2">
        {steps.map((s, i) => (
          <div key={i} className="flex gap-2 text-green-700">
            <span>✓</span> <span>{s}</span>
          </div>
        ))}
        {status === 'running' && (
          <div className="flex gap-2 text-blue-600 animate-pulse">
            <span>●</span> <span>Processing...</span>
          </div>
        )}
        {status === 'waiting' && (
          <div className="flex gap-2 text-blue-600 animate-pulse">
            <span>●</span> <span>Awaiting user action...</span>
          </div>
        )}
      </div>
    </div>
  );
}
