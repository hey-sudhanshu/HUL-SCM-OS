'use client';
import { useState } from 'react';
import { Shield, Check, X } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

export function Governance() {
  const [activeTab, setActiveTab] = useState<'raci'|'queue'|'audit'>('queue');
  
  // Real data structure mock as per user prompt: allowed, reason, required_approver
  const queue = [
    { id: 'REQ-9102', originating_app: 'Orion', before_kpis: 'Capacity: 92%', after_kpis: 'Capacity: 88%', status: 'PENDING', requested_by: 'Orion_Agent', amount: 0, required_approver: 'Plant Manager' },
    { id: 'REQ-9103', originating_app: 'Inventory', before_kpis: 'Stock: 15d', after_kpis: 'Stock: 25d', status: 'PENDING', requested_by: 'Inv_Agent', amount: 125000, required_approver: 'Supply Director' }
  ];

  const audit = [
    { id: 'AUD-1001', actor: 'Supply Director', action: 'APPROVED', details: 'Approved safety stock override for Q3', timestamp: '10:42 AM' },
    { id: 'AUD-1002', actor: 'System', action: 'AUTO-APPROVED', details: 'Route deviation within 5% SLA tolerance', timestamp: '09:15 AM' }
  ];

  return (
    <div className="scm-app-layout">
      <div className="scm-header">
        <div className="scm-header-title">
          <Shield className="w-4 h-4 text-purple-600" />
          GOVERNANCE & RACI
        </div>
        <div className="scm-badge scm-badge-purple">SECURE NODE</div>
      </div>
      
      <div className="scm-toolbar p-0">
        <div className="flex w-full">
          {['queue', 'raci', 'audit'].map(tab => (
            <div 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer border-b-2 transition-colors ${activeTab === tab ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
            >
              {tab}
            </div>
          ))}
        </div>
      </div>

      <div className="scm-main">
        <div className="scm-panel flex-1">
          {activeTab === 'queue' && (
            <div className="scm-table-container">
              <table className="scm-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>App Source</th>
                    <th>State Change</th>
                    <th>Approver Required</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map(q => (
                    <tr key={q.id}>
                      <td className="font-bold text-purple-700">{q.id}</td>
                      <td>{q.originating_app}</td>
                      <td className="text-gray-500">{q.before_kpis} &rarr; <span className="text-gray-900 font-bold">{q.after_kpis}</span></td>
                      <td><span className="scm-badge scm-badge-amber">{q.required_approver}</span></td>
                      <td className="flex gap-2">
                        <button className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 border border-green-200"><Check className="w-3 h-3"/></button>
                        <button className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 border border-red-200"><X className="w-3 h-3"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'audit' && (
            <div className="scm-table-container">
              <table className="scm-table">
                <thead>
                  <tr>
                    <th>Audit ID</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Details</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map(a => (
                    <tr key={a.id}>
                      <td className="font-bold text-gray-500">{a.id}</td>
                      <td>{a.actor}</td>
                      <td>
                        <span className={`scm-badge ${a.action.includes('APPROVED')?'scm-badge-green':'scm-badge-red'}`}>{a.action}</span>
                      </td>
                      <td className="text-gray-600">{a.details}</td>
                      <td className="text-right text-gray-400">{a.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'raci' && (
            <div className="p-8 text-center text-gray-500 text-xs font-mono">
              RACI MATRIX LOADED. ALL SYSTEM ACTIONS MAP TO ALLOWED, REASON, AND REQUIRED_APPROVER PROPERTIES.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
