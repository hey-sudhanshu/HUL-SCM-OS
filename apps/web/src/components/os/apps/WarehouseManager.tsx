'use client';
import { useEffect, useState } from 'react';
import { fetchNetworkData } from '@/lib/api';
import { formatNumber, formatPercent } from '@/lib/format';
import { Box, Filter } from 'lucide-react';
import { SCMMap } from '../../map/SCMMap';

export function WarehouseManager() {
  const [data, setData] = useState<any>(null);
  const [selectedWH, setSelectedWH] = useState<any>(null);

  useEffect(() => {
    fetchNetworkData().then(setData);
  }, []);

  if (!data) return <div className="p-8 text-sm font-mono text-gray-500 flex items-center gap-2"><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"/> Loading Warehouse Data...</div>;

  const warehouses = data.warehouses || [];

  return (
    <div className="scm-app-layout">
      <div className="scm-header">
        <div className="scm-header-title">
          <Box className="w-4 h-4 text-[var(--sys-amber)]" />
          WAREHOUSE INTELLIGENCE
        </div>
      </div>

      <div className="scm-kpi-strip">
        <div className="scm-kpi-card">
          <div className="scm-kpi-label">Active Warehouses</div>
          <div className="scm-kpi-value">{formatNumber(warehouses.length)}</div>
        </div>
        <div className="scm-kpi-card">
          <div className="scm-kpi-label">Total Capacity</div>
          <div className="scm-kpi-value">{formatNumber(warehouses.reduce((a:number,b:any) => a + (b.capacity || 0), 0))}</div>
        </div>
        <div className="scm-kpi-card">
          <div className="scm-kpi-label">Current Inventory</div>
          <div className="scm-kpi-value">{formatNumber(warehouses.reduce((a:number,b:any) => a + (b.current_inventory || 0), 0))}</div>
        </div>
        <div className="scm-kpi-card">
          <div className="scm-kpi-label">Avg Utilization</div>
          <div className="scm-kpi-value">{formatPercent(warehouses.reduce((a:number,b:any) => a + (b.current_inventory || 0) / (b.capacity || 1), 0) / (warehouses.length || 1))}</div>
        </div>
      </div>

      <div className="scm-main">
        <div className="scm-panel w-2/5">
          <div className="scm-toolbar justify-between">
            <span className="font-bold">Operations Matrix</span>
            <Filter className="w-3 h-3 text-gray-400" />
          </div>
          <div className="scm-table-container">
            <table className="scm-table">
              <thead>
                <tr>
                  <th>WH ID</th>
                  <th>Location</th>
                  <th className="text-right">Capacity</th>
                  <th className="text-right">Inventory</th>
                  <th className="text-right">Util %</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((w: any) => {
                  const util = w.capacity ? (w.current_inventory || 0) / w.capacity : 0;
                  return (
                    <tr key={w.id} onClick={() => setSelectedWH(w)} className={selectedWH?.id === w.id ? 'bg-amber-50/80' : ''}>
                      <td className="font-bold text-[var(--sys-amber)]">{w.id}</td>
                      <td>{w.location || 'N/A'}</td>
                      <td className="text-right">{formatNumber(w.capacity)}</td>
                      <td className="text-right">{formatNumber(w.current_inventory)}</td>
                      <td className="text-right font-bold text-gray-900">{formatPercent(util)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="scm-panel flex-1">
          <div className="scm-panel-header">Geographic Context</div>
          <div className="flex-1 relative">
            <SCMMap 
              nodes={warehouses}
              selectedNodeId={selectedWH?.id}
              onNodeSelect={setSelectedWH}
              viewState={{ longitude: 78.9629, latitude: 20.5937, zoom: 3.5 }}
            />
          </div>
        </div>

        {selectedWH && (
          <div className="scm-panel w-64 bg-gray-50 border-l border-gray-200">
            <div className="scm-panel-header bg-gray-200/50">Details</div>
            <div className="scm-panel-content">
              <div className="text-xl font-black">{selectedWH.id}</div>
              <div className="text-xs text-gray-500 uppercase font-semibold mb-4">{selectedWH.location || 'N/A'}</div>
              
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-500">Utilization</div>
                  <div className="h-2 w-full bg-gray-200 rounded-full mt-1 overflow-hidden">
                    <div 
                      className="h-full bg-[var(--sys-amber)]" 
                      style={{ width: `${Math.min(100, ((selectedWH.current_inventory || 0) / (selectedWH.capacity || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="p-2 bg-white border border-gray-200 rounded text-center">
                    <div className="text-xs text-gray-500">Op Cost</div>
                    <div className="font-mono font-bold">{formatNumber(selectedWH.operating_cost)}</div>
                  </div>
                  <div className="p-2 bg-white border border-gray-200 rounded text-center">
                    <div className="text-xs text-gray-500">Service</div>
                    <div className="font-mono font-bold text-green-600">{(selectedWH.service_level ? selectedWH.service_level * 100 : 98).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
