import React from 'react';
import { useGovernanceStore } from '@/lib/governanceStore';

export function ApprovalCard({ queueItem }: { queueItem: any }) {
  const processQueueItem = useGovernanceStore(state => state.processQueueItem);

  const handleAction = (action: 'approve' | 'reject') => {
    const res = processQueueItem(queueItem.id, action);
    if (!res.success) {
      alert(`Governance Blocked: ${res.reason}`);
    }
  };

  return (
    <div className="bg-white border-2 border-sys-black shadow-[4px_4px_0_var(--sys-black)] p-4 flex flex-col font-sans">
      <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-3">
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase">{queueItem.originating_app}</div>
          <div className="font-bold text-[var(--sys-teal)]">{queueItem.decision}</div>
        </div>
        <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 font-bold border border-yellow-300">
          {queueItem.status}
        </div>
      </div>
      
      <div className="bg-gray-50 p-2 mb-3 text-xs font-mono border border-gray-200">
        <div className="font-bold mb-1">Context</div>
        <pre className="text-[10px] whitespace-pre-wrap">{JSON.stringify(queueItem.context, null, 2)}</pre>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
        <div>
          <div className="font-bold text-gray-500 mb-1 border-b border-gray-200">Before</div>
          {Object.entries(queueItem.before_kpis || {}).map(([k,v]) => (
            <div key={k} className="flex justify-between mt-1"><span>{k}:</span> <span>{v as React.ReactNode}</span></div>
          ))}
        </div>
        <div>
          <div className="font-bold text-[var(--sys-teal)] mb-1 border-b border-[var(--sys-teal)]">After (Projected)</div>
          {Object.entries(queueItem.after_kpis || {}).map(([k,v]) => (
            <div key={k} className="flex justify-between mt-1 font-bold"><span>{k}:</span> <span>{v as React.ReactNode}</span></div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mt-auto">
        <button 
          onClick={() => handleAction('reject')}
          className="flex-1 border border-sys-black py-2 font-bold hover:bg-gray-100 transition-colors"
        >
          Reject
        </button>
        <button 
          onClick={() => handleAction('approve')}
          className="flex-1 bg-[var(--sys-teal)] text-white border border-sys-black py-2 font-bold hover:brightness-110 transition-colors shadow-sm"
        >
          Approve
        </button>
      </div>
    </div>
  );
}
