'use client';
import { useState, useEffect } from 'react';
import { fetchNetworkData } from '@/lib/api';
import { formatNumber, formatCurrency } from '@/lib/format';
import { Archive, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';

export function InventoryLab() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchNetworkData().then(setData);
  }, []);

  if (!data) return <div className="p-8 text-xs font-mono text-gray-500">Loading Inventory...</div>;

  const mockSkus = [
    { id: 'SKU-A100', name: 'Premium Detergent 1kg', class: 'A', value: 1450000, days: 12, risk: 'LOW' },
    { id: 'SKU-B220', name: 'Standard Soap Multipack', class: 'B', value: 820000, days: 25, risk: 'MEDIUM' },
    { id: 'SKU-C905', name: 'Niche Shampoo 200ml', class: 'C', value: 125000, days: 65, risk: 'HIGH' }
  ];

  return (
    <div className="scm-app-layout">
      <div className="scm-header">
        <div className="scm-header-title">
          <Archive className="w-4 h-4 text-orange-600" />
          INVENTORY LAB
        </div>
      </div>
      
      <div className="scm-kpi-strip">
        <div className="scm-kpi-card">
          <div className="scm-kpi-label">Total Inventory Value</div>
          <div className="scm-kpi-value">{formatCurrency(2395000)}</div>
        </div>
        <div className="scm-kpi-card">
          <div className="scm-kpi-label">Avg Days of Cover</div>
          <div className="scm-kpi-value">22 Days</div>
        </div>
        <div className="scm-kpi-card">
          <div className="scm-kpi-label">Stockout Risk</div>
          <div className="scm-kpi-value text-red-600">4.2%</div>
        </div>
      </div>

      <div className="scm-main">
        <div className="scm-panel flex-1">
          <div className="scm-panel-header">ABC Analysis</div>
          <div className="scm-table-container">
            <table className="scm-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Description</th>
                  <th>Class</th>
                  <th className="text-right">Value</th>
                  <th className="text-right">Cover</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {mockSkus.map(s => (
                  <tr key={s.id}>
                    <td className="font-bold">{s.id}</td>
                    <td>{s.name}</td>
                    <td><span className={`font-black ${s.class==='A'?'text-green-600':s.class==='B'?'text-amber-500':'text-red-500'}`}>{s.class}</span></td>
                    <td className="text-right">{formatCurrency(s.value)}</td>
                    <td className="text-right">{s.days}d</td>
                    <td><span className={`scm-badge ${s.risk==='LOW'?'scm-badge-green':s.risk==='MEDIUM'?'scm-badge-amber':'scm-badge-red'}`}>{s.risk}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
