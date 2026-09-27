'use client';

import React, { useState } from 'react';
import { ClipboardCheck, Check, X, ShieldAlert, Activity, UserCircle } from 'lucide-react';
import { useGovernanceStore } from '@/lib/governanceStore';

const RACI_MATRIX = [
  { decision: 'Route Override', roles: { SC_LEAD: 'A', DISPATCHER: 'R', PLANNER: 'C', WAREHOUSE_MGR: 'I' } },
  { decision: 'Capacity Expansion', roles: { SC_LEAD: 'A', DISPATCHER: 'I', PLANNER: 'R', WAREHOUSE_MGR: 'C' } },
  { decision: 'Vendor Switch', roles: { SC_LEAD: 'A', DISPATCHER: 'I', PLANNER: 'C', WAREHOUSE_MGR: 'I' } },
  { decision: 'Emergency Expedite', roles: { SC_LEAD: 'I', DISPATCHER: 'R', PLANNER: 'A', WAREHOUSE_MGR: 'C' } },
];

export function Governance() {
  const { queue, auditLog, processQueueItem, currentRole } = useGovernanceStore();
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'RACI' | 'AUDIT'>('QUEUE');

  const handleProcess = (id: string, action: 'approve' | 'reject') => {
    processQueueItem(id, action);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 font-mono text-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-5 h-5 text-indigo-400" />
          <h2 className="font-bold tracking-wider text-white">GOVERNANCE & RACI</h2>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-md border border-slate-700">
          <UserCircle className="w-4 h-4 text-slate-400" />
          <span className="text-slate-300 text-xs font-medium">ROLE:</span>
          <span className="text-indigo-400 font-bold">{currentRole}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-4 border-b border-slate-800 shrink-0 gap-2">
        {(['QUEUE', 'RACI', 'AUDIT'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-t-lg font-medium transition-colors ${
              activeTab === tab
                ? 'bg-slate-800 text-white border-t border-l border-r border-slate-700'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-slate-900 p-4">
        {activeTab === 'QUEUE' && (
          <div className="space-y-4">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-3">
                <ShieldAlert className="w-10 h-10 opacity-20" />
                <p>No pending approvals in queue.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-y border-slate-800 text-slate-400">
                    <th className="p-3 font-medium">ID / SOURCE</th>
                    <th className="p-3 font-medium">DECISION</th>
                    <th className="p-3 font-medium">IMPACT (KPIs)</th>
                    <th className="p-3 font-medium">APPROVER</th>
                    <th className="p-3 font-medium">STATUS</th>
                    <th className="p-3 font-medium text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {queue.map(item => (
                    <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-3">
                        <div className="font-medium text-white">{item.id}</div>
                        <div className="text-xs text-slate-500 mt-1">{item.sourceApp}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-slate-300 max-w-xs">{item.decision}</div>
                        {item.id.startsWith('SAMPLE') && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 bg-indigo-900/40 text-indigo-400 text-[10px] rounded border border-indigo-500/20">
                            DEMO
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-xs space-y-1">
                          {Object.entries(item.kpiImpact).map(([kpi, change]) => (
                            <div key={kpi} className="flex gap-2">
                              <span className="text-slate-500 w-16">{kpi}:</span>
                              <span className={change.includes('-') && !kpi.includes('Cost') ? 'text-red-400' : 'text-green-400'}>
                                {change}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-xs text-slate-400">{item.requiredRole}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs border ${
                          item.status === 'pending' ? 'bg-amber-900/20 text-amber-400 border-amber-900/50' :
                          item.status === 'approved' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-900/50' :
                          'bg-red-900/20 text-red-400 border-red-900/50'
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {item.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleProcess(item.id, 'approve')}
                              className="p-1.5 bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50 rounded border border-emerald-900/50 transition-colors"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleProcess(item.id, 'reject')}
                              className="p-1.5 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded border border-red-900/50 transition-colors"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'RACI' && (
          <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                  <th className="p-4 font-medium">DECISION AREA</th>
                  <th className="p-4 font-medium text-center">SC_LEAD</th>
                  <th className="p-4 font-medium text-center">PLANNER</th>
                  <th className="p-4 font-medium text-center">DISPATCHER</th>
                  <th className="p-4 font-medium text-center">WAREHOUSE_MGR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {RACI_MATRIX.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-4 font-medium text-slate-300">{row.decision}</td>
                    {['SC_LEAD', 'PLANNER', 'DISPATCHER', 'WAREHOUSE_MGR'].map(role => {
                      const val = (row.roles as any)[role];
                      return (
                        <td key={role} className="p-4 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${
                            val === 'R' ? 'bg-blue-900/40 text-blue-400 border border-blue-800' :
                            val === 'A' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800' :
                            val === 'C' ? 'bg-amber-900/40 text-amber-400 border border-amber-800' :
                            'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}>
                            {val}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 bg-slate-900 border-t border-slate-800 text-xs text-slate-500 flex gap-6">
              <span><strong className="text-emerald-400">A</strong>ccountable</span>
              <span><strong className="text-blue-400">R</strong>esponsible</span>
              <span><strong className="text-amber-400">C</strong>onsulted</span>
              <span><strong className="text-slate-400">I</strong>nformed</span>
            </div>
          </div>
        )}

        {activeTab === 'AUDIT' && (
          <div className="space-y-2">
            {auditLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-3">
                <Activity className="w-10 h-10 opacity-20" />
                <p>No audit events recorded yet.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs">
                    <th className="pb-2 font-medium">TIMESTAMP</th>
                    <th className="pb-2 font-medium">ACTOR</th>
                    <th className="pb-2 font-medium">ACTION</th>
                    <th className="pb-2 font-medium">DETAILS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {auditLog.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/10">
                      <td className="py-3 pr-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 pr-4 text-xs font-medium text-indigo-300">
                        {log.actorRole}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${
                          log.action === 'approve' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-900/50' :
                          log.action === 'reject' ? 'bg-red-900/20 text-red-400 border-red-900/50' :
                          'bg-indigo-900/20 text-indigo-400 border-indigo-900/50'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-slate-400">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
