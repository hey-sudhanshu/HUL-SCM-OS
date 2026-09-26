'use client';
import { useState, useEffect } from 'react';
import { fetchNetworkData } from '@/lib/api';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/format';
import { Truck } from 'lucide-react';
import { SCMMap } from '../../map/SCMMap';

export function DispatchManager() {
  const [data, setData] = useState<any>(null);
  const [selectedDispatch, setSelectedDispatch] = useState<any>(null);

  useEffect(() => {
    fetchNetworkData().then(setData);
  }, []);

  if (!data) return <div className="p-8 text-xs font-mono text-gray-500">Loading Dispatch Data...</div>;

  // Assuming dispatch queue comes from API, fallback to mock if missing for visual layout
  const dispatches = data.dispatches || [
    { id: 'DSP-8001', origin: 'P-MH', destination: 'CFA-BOM', vehicle: 'TRK-20T', status: 'IN_TRANSIT', cost: 45000, completion: 0.65 },
    { id: 'DSP-8002', origin: 'P-GJ', destination: 'WH-DEL', vehicle: 'TRK-32T', status: 'QUEUED', cost: 82000, completion: 0 },
    { id: 'DSP-8003', origin: 'WH-DEL', destination: 'D-DEL-01', vehicle: 'TRK-9T', status: 'DELIVERED', cost: 12000, completion: 1 }
  ];

  return (
    <div className="scm-app-layout">
      <div className="scm-header">
        <div className="scm-header-title">
          <Truck className="w-4 h-4 text-gray-700" />
          DISPATCH MANAGER
        </div>
      </div>
      
      <div className="scm-kpi-strip">
        <div className="scm-kpi-card">
          <div className="scm-kpi-label">Active Dispatches</div>
          <div className="scm-kpi-value">{formatNumber(dispatches.filter((d:any) => d.status === 'IN_TRANSIT').length)}</div>
        </div>
        <div className="scm-kpi-card">
          <div className="scm-kpi-label">Queued</div>
          <div className="scm-kpi-value">{formatNumber(dispatches.filter((d:any) => d.status === 'QUEUED').length)}</div>
        </div>
        <div className="scm-kpi-card">
          <div className="scm-kpi-label">Total Freight In Transit</div>
          <div className="scm-kpi-value">{formatCurrency(dispatches.reduce((a:number,b:any) => a + (b.status === 'IN_TRANSIT' ? b.cost : 0), 0))}</div>
        </div>
      </div>

      <div className="scm-main">
        <div className="scm-panel w-1/2">
          <div className="scm-table-container">
            <table className="scm-table">
              <thead>
                <tr>
                  <th>Dispatch ID</th>
                  <th>Route</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th className="text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {dispatches.map((d: any) => (
                  <tr key={d.id} onClick={() => setSelectedDispatch(d)} className={selectedDispatch?.id === d.id ? 'bg-gray-100' : ''}>
                    <td className="font-bold">{d.id}</td>
                    <td>{d.origin} → {d.destination}</td>
                    <td>{d.vehicle}</td>
                    <td>
                      <span className={`scm-badge ${d.status==='DELIVERED'?'scm-badge-green':d.status==='QUEUED'?'scm-badge-amber':'scm-badge-blue'}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="text-right">{formatCurrency(d.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="scm-panel flex-1">
          <div className="scm-panel-header">Live Tracking</div>
          <div className="flex-1 bg-gray-100 flex items-center justify-center p-8 text-center text-gray-400">
            {selectedDispatch ? (
              <div className="w-full max-w-sm bg-white p-6 rounded shadow-sm border border-gray-200">
                <div className="font-bold text-lg text-gray-900">{selectedDispatch.id}</div>
                <div className="text-xs text-gray-500 mb-6">{selectedDispatch.origin} to {selectedDispatch.destination}</div>
                
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${selectedDispatch.completion * 100}%` }} />
                </div>
                <div className="flex justify-between mt-2 text-xs font-mono font-bold">
                  <span>{formatPercent(selectedDispatch.completion)}</span>
                  <span>{selectedDispatch.status}</span>
                </div>
              </div>
            ) : (
              <div>Select a dispatch to view live tracking details.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
