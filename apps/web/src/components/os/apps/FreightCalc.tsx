'use client';
import { useState, useEffect } from 'react';
import { fetchNetworkData } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/format';
import { Calculator } from 'lucide-react';
import { Chart as ChartJS, registerables } from 'chart.js';
ChartJS.register(...registerables);

export function FreightCalculator() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchNetworkData().then(setData);
  }, []);

  if (!data) return <div className="p-8 text-xs font-mono text-gray-500">Loading Freight Data...</div>;

  const mockRates = [
    { lane: 'P-MH → CFA-BOM', distance: 150, rateKm: 45, type: 'FTL', total: 6750 },
    { lane: 'P-GJ → WH-DEL', distance: 950, rateKm: 42, type: 'FTL', total: 39900 },
    { lane: 'WH-DEL → D-DEL-01', distance: 45, rateKm: 65, type: 'LTL', total: 2925 }
  ];

  return (
    <div className="scm-app-layout">
      <div className="scm-header">
        <div className="scm-header-title">
          <Calculator className="w-4 h-4 text-slate-600" />
          FREIGHT CALCULATOR
        </div>
      </div>
      
      <div className="scm-kpi-strip">
        <div className="scm-kpi-card">
          <div className="scm-kpi-label">Avg Rate / km (FTL)</div>
          <div className="scm-kpi-value">₹44.50</div>
        </div>
        <div className="scm-kpi-card">
          <div className="scm-kpi-label">Avg Rate / km (LTL)</div>
          <div className="scm-kpi-value">₹68.20</div>
        </div>
      </div>

      <div className="scm-main">
        <div className="scm-panel flex-1">
          <div className="scm-panel-header">Standard Lane Rates</div>
          <div className="scm-table-container">
            <table className="scm-table">
              <thead>
                <tr>
                  <th>Lane</th>
                  <th className="text-right">Distance</th>
                  <th>Type</th>
                  <th className="text-right">Rate/km</th>
                  <th className="text-right">Total Freight</th>
                </tr>
              </thead>
              <tbody>
                {mockRates.map((r, i) => (
                  <tr key={i}>
                    <td className="font-bold text-slate-700">{r.lane}</td>
                    <td className="text-right">{formatNumber(r.distance)} km</td>
                    <td><span className="scm-badge scm-badge-blue">{r.type}</span></td>
                    <td className="text-right font-mono">{formatCurrency(r.rateKm)}</td>
                    <td className="text-right font-bold text-slate-900 font-mono">{formatCurrency(r.total)}</td>
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
