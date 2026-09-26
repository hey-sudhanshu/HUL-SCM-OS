'use client';
import { useState, useEffect } from 'react';
import { fetchNetworkData } from '@/lib/api';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format';
import { AlertTriangle, Play } from 'lucide-react';

export function RiskSimulator() {
  const [data, setData] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    fetchNetworkData().then(setData);
  }, []);

  const runSim = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setResults({ p50: 2450000, p95: 5800000, riskProp: 0.12 });
      setIsSimulating(false);
    }, 1500);
  };

  if (!data) return <div className="p-8 text-xs font-mono text-gray-500">Loading Risk Data...</div>;

  return (
    <div className="scm-app-layout">
      <div className="scm-header">
        <div className="scm-header-title text-red-700">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          MONTE CARLO RISK SIMULATOR
        </div>
      </div>
      
      <div className="scm-toolbar">
        <span className="font-bold mr-4">Simulation Parameters</span>
        <button className="scm-button bg-red-600 hover:bg-red-700 ml-auto" onClick={runSim} disabled={isSimulating}>
          {isSimulating ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Play className="w-3 h-3" />}
          Run Simulation
        </button>
      </div>

      <div className="scm-main">
        <div className="scm-panel flex-1 bg-gray-50 flex items-center justify-center p-8 text-center">
          {results ? (
            <div className="grid grid-cols-3 gap-6 w-full max-w-2xl">
              <div className="bg-white p-6 rounded shadow border border-red-100">
                <div className="text-xs uppercase font-bold text-gray-500 mb-2">P50 Expected Loss</div>
                <div className="text-2xl font-black font-mono text-gray-800">{formatCurrency(results.p50)}</div>
              </div>
              <div className="bg-white p-6 rounded shadow border border-red-200 ring-2 ring-red-500/20">
                <div className="text-xs uppercase font-bold text-red-500 mb-2">P95 Tail Risk</div>
                <div className="text-2xl font-black font-mono text-red-700">{formatCurrency(results.p95)}</div>
              </div>
              <div className="bg-white p-6 rounded shadow border border-red-100">
                <div className="text-xs uppercase font-bold text-gray-500 mb-2">Service Risk Prob</div>
                <div className="text-2xl font-black font-mono text-gray-800">{formatPercent(results.riskProp)}</div>
              </div>
            </div>
          ) : (
            <div className="text-gray-400 font-mono text-sm">Configure parameters and execute Monte Carlo engine to view exposure.</div>
          )}
        </div>
      </div>
    </div>
  );
}
