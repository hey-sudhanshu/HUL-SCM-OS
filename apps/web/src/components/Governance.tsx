import React, { useState } from 'react';
import { useGovernanceStore } from '../lib/governanceStore';
import { RACIAssignment, RACIDecision, RACIRole, validate_raci, check_raci_permission } from '../lib/governance';
import clsx from 'clsx';

export const Governance = ({ onClose }: { onClose?: () => void }) => {
  const store = useGovernanceStore();
  const [tab, setTab] = useState<'matrix' | 'queue' | 'audit'>('matrix');
  const [denialMsg, setDenialMsg] = useState<string | null>(null);
  const [orionOpen, setOrionOpen] = useState(true);
  const [selectedQueueItem, setSelectedQueueItem] = useState<any | null>(null);
  const [raciAnalysis, setRaciAnalysis] = useState<any | null>(null);

  const roles: RACIRole[] = ['Demand Planner', 'Inventory Planner', 'Warehouse Manager', 'Logistics Head', 'Procurement Head', 'Supply Chain Director', 'AI Agent'];
  const decisions = Object.keys(store.matrix) as RACIDecision[];

  const cycleRACI = (d: RACIDecision, r: RACIRole) => {
    const current = store.matrix[d][r];
    const sequence: RACIAssignment[] = ['R', 'A', 'C', 'I', ''];
    const next = sequence[(sequence.indexOf(current) + 1) % sequence.length];
    
    const newMatrix = { ...store.matrix, [d]: { ...store.matrix[d], [r]: next } };
    store.setMatrix(newMatrix);
  };

  const validation = validate_raci(store.matrix);

  const analyzePermission = (item: any) => {
    setSelectedQueueItem(item);
    const roleMap: Record<string, RACIRole> = {
        'Orion Orchestrator': 'AI Agent',
        'Vendor Manager': 'Procurement Head',
        'Inventory Lab': 'Inventory Planner',
        'AI Agent': 'AI Agent'
    };
    const mappedRole = roleMap[item.originating_app] || 'Inventory Planner';
    const mappedDecision = item.decision as RACIDecision;
    
    if (store.matrix[mappedDecision]) {
        const check = check_raci_permission(store.matrix, mappedRole, mappedDecision, 'commit');
        setRaciAnalysis({ ...check, role: mappedRole, decision: mappedDecision });
    }
  };

  const handleProcess = (id: string, action: 'approve' | 'reject' | 'modify') => {
    const res = store.processQueueItem(id, action, () => {
      console.log(`Executed side effect for ${id}`);
    });
    if (!res.success) {
      setDenialMsg(res.reason);
    }
    if (selectedQueueItem?.id === id) {
        setSelectedQueueItem(null);
        setRaciAnalysis(null);
    }
  };

  return (
    <div className="flex w-full h-full bg-sys-bg text-sys-black font-sans relative overflow-hidden">
      
      {/* Denial Dialog */}
      {denialMsg && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-sys-bg border border-sys-black shadow-[4px_4px_0_var(--sys-black)] p-4 w-96 flex flex-col gap-4">
                <div className="flex items-center gap-2 font-bold text-red-600 bg-red-100 p-2 border border-red-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    Action Blocked
                </div>
                <p className="text-sm">{denialMsg}</p>
                <div className="flex justify-end">
                    <button onClick={() => setDenialMsg(null)} className="px-4 py-1 bg-white border border-sys-black shadow-sm font-bold">Acknowledge</button>
                </div>
            </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
          <div className="flex border-b border-sys-black bg-white overflow-x-auto shrink-0">
              {['matrix', 'queue', 'audit'].map(t => (
                  <div 
                      key={t}
                      onClick={() => setTab(t as any)}
                      className={clsx(
                          "px-4 py-2 cursor-pointer border-r border-sys-black text-sm font-semibold whitespace-nowrap capitalize transition-colors",
                          tab === t ? "bg-[var(--sys-teal)] text-white" : "hover:bg-gray-100"
                      )}
                  >
                      {t}
                  </div>
              ))}
          </div>

          <div className="flex-1 overflow-auto p-4 flex flex-col">
            {tab === 'matrix' && (
              <div className="h-full flex flex-col bg-white border border-sys-black shadow-sm">
                <div className="bg-[var(--sys-teal)] text-white px-3 py-2 font-bold text-sm border-b border-sys-black flex justify-between">
                    RACI Matrix
                    {!validation.valid && <span className="bg-red-500 px-2 rounded-sm text-xs border border-white">Invalid State</span>}
                </div>
                {!validation.valid && (
                    <div className="bg-red-50 border-b border-red-200 p-2 text-xs text-red-700">
                        {validation.errors.map((e, i) => <div key={i}>• {e}</div>)}
                    </div>
                )}
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-xs font-sans text-left border-collapse">
                    <thead className="bg-gray-100 sticky top-0 shadow-sm z-10">
                      <tr>
                        <th className="p-2 border border-sys-black/20 w-48 font-bold">Decision / Process</th>
                        {roles.map(r => (
                          <th key={r} className="p-2 border border-sys-black/20 font-semibold text-center whitespace-nowrap">
                            <div className="writing-mode-vertical min-h-[100px] transform -rotate-180 m-auto" style={{ writingMode: 'vertical-rl' }}>{r}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {decisions.map(d => (
                        <tr key={d} className="hover:bg-gray-50 border-b border-sys-black/10">
                          <td className="p-2 border-r border-sys-black/20 font-medium">{d}</td>
                          {roles.map(r => {
                            const v = store.matrix[d][r];
                            let bg = '';
                            if (v === 'R') bg = 'bg-blue-100 font-bold';
                            if (v === 'A') bg = 'bg-red-100 font-bold text-red-700';
                            if (v === 'C') bg = 'bg-yellow-100';
                            if (v === 'I') bg = 'bg-gray-100';
                            
                            return (
                              <td 
                                key={r} 
                                className={clsx("p-2 border-r border-sys-black/20 text-center cursor-pointer hover:ring-2 ring-inset ring-[var(--sys-amber)] transition-all", bg)}
                                onClick={() => cycleRACI(d, r)}
                              >
                                {v}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'queue' && (
              <div className="h-full flex flex-col bg-white border border-sys-black shadow-sm">
                <div className="bg-[var(--sys-teal)] text-white px-3 py-2 font-bold text-sm border-b border-sys-black">
                    Approval Queue
                </div>
                <div className="flex-1 overflow-auto">
                    {store.queue.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 font-mono italic">Queue is empty</div>
                    ) : (
                        store.queue.map(q => (
                            <div key={q.id} className={clsx(
                                "border-b border-sys-black p-3 hover:bg-gray-50 transition-colors cursor-pointer",
                                selectedQueueItem?.id === q.id && "bg-[var(--sys-amber)]/10 ring-1 ring-inset ring-[var(--sys-amber)]"
                            )} onClick={() => analyzePermission(q)}>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="font-bold text-sys-black">{q.decision}</div>
                                        <div className="text-xs text-gray-600 mt-1">Requested by: <span className="font-mono bg-gray-100 px-1 border border-gray-300">{q.originating_app}</span></div>
                                    </div>
                                    <div className="text-[10px] font-mono text-gray-400">{new Date(q.timestamp).toLocaleString()}</div>
                                </div>
                                <div className="text-sm font-mono bg-white border border-sys-black/10 p-2 mb-3">
                                    <div className="text-gray-500 mb-1">State Transition:</div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="bg-red-50 text-red-700 px-1 border border-red-200">{JSON.stringify(q.before_kpis || q.payload)}</span>
                                        <span>→</span>
                                        <span className="bg-green-50 text-green-700 px-1 border border-green-200">{JSON.stringify(q.after_kpis || q.payload)}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); handleProcess(q.id, 'approve'); }} className="bg-green-600 text-white px-4 py-1 text-xs font-bold shadow-sm hover:brightness-110">Approve</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleProcess(q.id, 'reject'); }} className="bg-red-600 text-white px-4 py-1 text-xs font-bold shadow-sm hover:brightness-110">Reject</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
              </div>
            )}

            {tab === 'audit' && (
              <div className="h-full flex flex-col bg-white border border-sys-black shadow-sm">
                 <div className="bg-[var(--sys-teal)] text-white px-3 py-2 font-bold text-sm border-b border-sys-black">
                    Audit Log
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-2">
                    {store.auditLog.map(a => (
                        <div key={a.id} className="text-xs font-mono border-b border-sys-black/10 pb-2 flex items-start gap-4">
                            <span className="text-gray-500 whitespace-nowrap">{new Date(a.timestamp).toLocaleString()}</span>
                            <span className={clsx(
                                "px-1 border font-bold",
                                a.action.includes('approve') ? "bg-green-100 text-green-700 border-green-300" :
                                a.action.includes('reject') || a.action.includes('denied') ? "bg-red-100 text-red-700 border-red-300" :
                                "bg-yellow-100 text-yellow-700 border-yellow-300"
                            )}>{a.action.toUpperCase()}</span>
                            <span className="flex-1 text-sys-black">{a.details} (Actor: {a.actor})</span>
                        </div>
                    ))}
                </div>
              </div>
            )}
          </div>
      </div>

      {/* Orion Embedded Agent Panel */}
      {orionOpen && (
          <div className="w-72 bg-white border-l border-sys-black flex flex-col shadow-[-4px_0_15px_rgba(0,0,0,0.05)] z-10 shrink-0">
              <div className="bg-[var(--sys-teal)] text-white px-3 py-2 font-bold text-sm flex justify-between items-center border-b border-sys-black">
                  <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-[var(--sys-amber)]">
                          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon>
                      </svg>
                      Orion Agent
                  </div>
                  <button onClick={() => setOrionOpen(false)} className="hover:bg-white/20 rounded-sm p-0.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
              </div>
              <div className="flex-1 p-3 overflow-y-auto text-sm font-sans space-y-4">
                  
                  {selectedQueueItem && raciAnalysis ? (
                      <>
                        <div className="bg-gray-50 border border-sys-black/10 p-2 rounded-sm">
                            <div className="text-xs text-gray-500 font-mono mb-1 border-b border-gray-200 pb-1">ORION RACI ANALYSIS</div>
                            <div className="space-y-1.5 font-mono text-[10px] mt-2">
                                <div className="flex gap-2 text-green-700"><span>✓</span> <span>Invoked `check_raci_permission`</span></div>
                                <div className="flex gap-2 text-sys-black"><span>●</span> Decision: {raciAnalysis.decision}</div>
                                <div className="flex gap-2 text-sys-black"><span>●</span> Requester Role: {raciAnalysis.role}</div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-[var(--sys-teal)] mb-1 text-xs">Governance Recommendation</h4>
                            <div className={clsx("p-2 border text-xs leading-relaxed", raciAnalysis.allowed ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300")}>
                                <div className="font-bold mb-1">{raciAnalysis.allowed ? "ACTION PERMITTED" : "ACTION BLOCKED"}</div>
                                <p className="mb-2 text-sys-black">{raciAnalysis.reason}</p>
                                
                                {!raciAnalysis.allowed && raciAnalysis.required_approver && (
                                    <div className="mt-2 font-mono text-[10px]">
                                        <div className="text-gray-500">Requires approval from:</div>
                                        <div className="font-bold">{raciAnalysis.required_approver}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                      </>
                  ) : (
                      <div className="bg-gray-50 border border-sys-black/10 p-4 rounded-sm text-center text-gray-500 italic text-xs">
                          Select an item from the Approval Queue to view Orion's RACI analysis.
                      </div>
                  )}

                  <div className="border-t border-sys-black/10 pt-4 mt-4">
                      <h4 className="font-bold text-[var(--sys-teal)] mb-1 text-xs">Global Matrix Status</h4>
                      {!validation.valid ? (
                          <div className="text-xs text-red-600 bg-red-50 p-2 border border-red-200">
                              Warning: {validation.errors.length} RACI conflicts detected. The matrix violates governance rules.
                          </div>
                      ) : (
                          <div className="text-xs text-green-700 bg-green-50 p-2 border border-green-200">
                              Matrix is fully compliant with HUL governance rules.
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
      {!orionOpen && (
          <div 
              className="w-8 bg-gray-100 border-l border-sys-black flex flex-col items-center py-2 cursor-pointer hover:bg-gray-200 shrink-0 absolute right-0 top-0 bottom-0 z-20"
              onClick={() => setOrionOpen(true)}
          >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-[var(--sys-teal)]">
                  <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon>
              </svg>
          </div>
      )}
    </div>
  );
};
