'use client';
import { useEffect, useState } from 'react';
import { fetchNetworkData } from '@/lib/api';
import { SCMMap } from '../../map/SCMMap';
import { formatNumber, formatCurrency } from '@/lib/format';
import { Search, Map as MapIcon, Database, Box } from 'lucide-react';

export function NetworkBrowser() {
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    fetchNetworkData().then(setData);
  }, []);

  if (!data) return <div className="p-8 text-sm font-mono text-gray-500 flex items-center gap-2"><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"/> Loading Network Topology...</div>;

  const allNodes = [...(data.plants || []), ...(data.warehouses || []), ...(data.cfas || []), ...(data.distributors || [])];
  
  const filteredNodes = allNodes.filter(n => 
    n.id.toLowerCase().includes(search.toLowerCase()) || 
    (n.location && n.location.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="scm-app-layout">
      <div className="scm-header">
        <div className="scm-header-title">
          <Database className="w-4 h-4 text-[var(--sys-teal)]" />
          NETWORK BROWSER
        </div>
        <div className="flex gap-2">
           <div className="relative">
             <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Search nodes..." className="scm-input pl-6 w-48" value={search} onChange={e => setSearch(e.target.value)} />
           </div>
        </div>
      </div>

      <div className="scm-kpi-strip">
        <div className="scm-kpi-card">
          <div className="scm-kpi-label">Total Nodes</div>
          <div className="scm-kpi-value">{formatNumber(allNodes.length)}</div>
        </div>
        <div className="scm-kpi-card">
          <div className="scm-kpi-label">Active Lanes</div>
          <div className="scm-kpi-value">{formatNumber(data.lanes?.length || 0)}</div>
        </div>
        <div className="scm-kpi-card">
          <div className="scm-kpi-label">Network Capacity</div>
          <div className="scm-kpi-value">{formatNumber(data.warehouses?.reduce((sum: number, w: any) => sum + (w.capacity || 0), 0))}</div>
        </div>
      </div>

      <div className="scm-main">
        <div className="scm-panel w-1/3">
          <div className="scm-panel-header">Directory</div>
          <div className="scm-table-container">
            <table className="scm-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {filteredNodes.slice(0, 100).map(n => (
                  <tr key={n.id} onClick={() => setSelectedNode(n)} className={selectedNode?.id === n.id ? 'bg-blue-50/80' : ''}>
                    <td className="font-bold">{n.id}</td>
                    <td>
                      <span className={`scm-badge ${n.type==='Plant'?'scm-badge-blue':n.type==='CFA'?'scm-badge-amber':'scm-badge-green'}`}>
                        {n.type}
                      </span>
                    </td>
                    <td>{n.location || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="scm-panel flex-1">
          <div className="scm-panel-header flex justify-between items-center">
            <span>Geographic View</span>
            <MapIcon className="w-3 h-3 opacity-50" />
          </div>
          <div className="flex-1 relative">
            <SCMMap 
              nodes={filteredNodes} 
              selectedNodeId={selectedNode?.id} 
              onNodeSelect={setSelectedNode}
            />
          </div>
        </div>

        {selectedNode && (
          <div className="scm-panel w-72 bg-gray-50 border-l border-gray-200">
            <div className="scm-panel-header bg-gray-200/50">Node Details</div>
            <div className="scm-panel-content flex flex-col gap-4">
              <div>
                <div className="text-xl font-black text-gray-900 tracking-tight">{selectedNode.id}</div>
                <div className="text-xs font-semibold text-gray-500 uppercase mt-1">{selectedNode.type} &bull; {selectedNode.location || 'Unknown Location'}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-white p-2 rounded border border-gray-200 shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Capacity</div>
                  <div className="font-mono text-sm font-bold text-gray-900">{formatNumber(selectedNode.capacity)}</div>
                </div>
                <div className="bg-white p-2 rounded border border-gray-200 shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Inventory</div>
                  <div className="font-mono text-sm font-bold text-gray-900">{formatNumber(selectedNode.current_inventory)}</div>
                </div>
              </div>

              <div className="mt-4 border-t border-gray-200 pt-4">
                <div className="text-[10px] uppercase font-bold text-gray-500 mb-2">Connected Lanes</div>
                <div className="text-xs font-mono text-gray-600 bg-white p-2 rounded border border-gray-200">
                  {data.lanes?.filter((l: any) => l.origin === selectedNode.id || l.destination === selectedNode.id).length || 0} active connections
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
