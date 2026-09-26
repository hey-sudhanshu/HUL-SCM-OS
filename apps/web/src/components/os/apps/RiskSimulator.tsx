'use client';
import React, { useState, useEffect } from 'react';
import { runMonteCarloSync, SimParams, SimResult } from '../../../lib/monte_carlo';
import { Bar } from 'react-chartjs-2';
import clsx from 'clsx';
import { Chart, registerables } from 'chart.js';
import { useGovernanceStore } from '@/lib/governanceStore';
import { useOSStore } from '@/lib/store/os';

Chart.register(...registerables);

export const RiskSimulator = ({ onClose }: { onClose?: () => void }) => {
  const [tab, setTab] = useState<'matrix' | 'simulation'>('matrix');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [orionOpen, setOrionOpen] = useState(true);

  const [params, setParams] = useState<SimParams>({
    iterations: 10000,
    seed: 42,
    laneLeadTimeMean: 10,
    laneLeadTimeStd: 2,
    demandMean: 100,
    demandType: 'normal',
    demandStd: 20,
    monsoonProb: 0.1,
    monsoonDelayMean: 5,
    monsoonDelayStd: 1,
    supplierFailProb: 0.05,
    supplierFailDelayMean: 15,
    supplierFailDelayStd: 5,
    whOutageProb: 0.02,
    whOutageDelayMean: 2,
    whOutageDelayStd: 0.5,
    safetyStock: 50,
    shortageCostPerUnit: 100
  });

  useEffect(() => {
    // Auto-run on load
    handleRun();
  }, []);

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      const res = runMonteCarloSync(params);
      setResult(res);
      setRunning(false);
    }, 300);
  };

  const getChartData = () => {
      if (!result) return { labels: [], datasets: [] };
      // Build histogram
      const bins = 20;
      const min = Math.min(...result.histCosts);
      const max = Math.max(...result.histCosts);
      const step = (max - min) / bins || 1;
      
      const counts = new Array(bins).fill(0);
      result.histCosts.forEach((c: number) => {
          let idx = Math.floor((c - min) / step);
          if (idx >= bins) idx = bins - 1;
          counts[idx]++;
      });

      const labels = counts.map((_, i) => `₹${Math.round(min + i * step)}`);
      
      return {
          labels,
          datasets: [{
              label: 'Frequency',
              data: counts,
              backgroundColor: '#1F2937',
          }]
      };
  };

  // Mock Risk matrix data
  const risks = [
      { id: 'R1', name: 'Monsoon Disruption', prob: 4, impact: 4 }, // 4x4
      { id: 'R2', name: 'Supplier Bankruptcy', prob: 2, impact: 5 }, // 2x5
      { id: 'R3', name: 'Port Strike', prob: 3, impact: 3 }, // 3x3
      { id: 'R4', name: 'Demand Surge (Festive)', prob: 5, impact: 3 }, // 5x3
      { id: 'R5', name: 'Warehouse Fire', prob: 1, impact: 5 }, // 1x5
  ];

  return (
    <div className="flex w-full h-full bg-sys-bg text-sys-black font-sans relative overflow-hidden">
        
        <div className="flex-1 flex flex-col min-w-0">
            <div className="flex border-b border-sys-black bg-white overflow-x-auto shrink-0 shadow-sm z-10">
                {['matrix', 'simulation'].map(t => (
                    <div 
                        key={t}
                        onClick={() => setTab(t as any)}
                        className={clsx(
                            "px-5 py-2 cursor-pointer border-r border-sys-black text-sm font-semibold whitespace-nowrap transition-colors capitalize",
                            tab === t ? "bg-[var(--sys-teal)] text-white" : "hover:bg-gray-100"
                        )}
                    >
                        {t === 'matrix' ? '5x5 Risk Matrix' : 'Monte Carlo Simulator'}
                    </div>
                ))}
            </div>

            <div className="flex-1 overflow-auto p-4">
                {tab === 'matrix' && (
                    <div className="flex gap-6 h-full">
                        <div className="flex-1 bg-white border border-sys-black shadow-sm flex flex-col items-center justify-center p-6 relative">
                            <div className="bg-[var(--sys-teal)] text-white px-3 py-2 font-bold text-sm border-b border-sys-black absolute top-0 left-0 right-0">Enterprise Risk Map</div>
                            
                            <div className="w-[400px] h-[400px] border-2 border-sys-black relative grid grid-cols-5 grid-rows-5 mt-8">
                                {/* Matrix Grid Cells */}
                                {Array.from({length: 25}).map((_, i) => {
                                    const row = Math.floor(i / 5);
                                    const col = i % 5;
                                    // Row 0 = impact 5, Col 0 = prob 1
                                    const prob = col + 1;
                                    const impact = 5 - row;
                                    const score = prob * impact;
                                    
                                    let bg = 'bg-green-100/50';
                                    if (score >= 10) bg = 'bg-yellow-200/50';
                                    if (score >= 15) bg = 'bg-orange-300/60';
                                    if (score >= 20) bg = 'bg-red-500/80';
                                    
                                    return <div key={i} className={clsx("border border-white/40", bg)} />;
                                })}

                                {/* Plot points */}
                                {risks.map(r => {
                                    // prob 1->0%, 5->100%. Grid cells are 20% each.
                                    // center of cell: (prob-1) * 20% + 10%
                                    const left = `${(r.prob - 1) * 20 + 10}%`;
                                    // impact 1-> bottom, 5-> top
                                    const bottom = `${(r.impact - 1) * 20 + 10}%`;
                                    
                                    return (
                                        <div 
                                            key={r.id}
                                            className="absolute w-6 h-6 bg-sys-black rounded-full border-2 border-white transform -translate-x-1/2 translate-y-1/2 flex items-center justify-center text-[10px] text-white font-bold cursor-pointer hover:scale-125 transition-transform shadow-md"
                                            style={{ left, bottom }}
                                            title={r.name}
                                        >
                                            {r.id}
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="absolute left-6 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs font-bold text-gray-500 tracking-widest">IMPACT (1-5)</div>
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-500 tracking-widest">PROBABILITY (1-5)</div>
                        </div>

                        <div className="w-72 bg-white border border-sys-black shadow-sm flex flex-col">
                             <div className="bg-[var(--sys-teal)] text-white px-3 py-2 font-bold text-sm border-b border-sys-black">Risk Register</div>
                             <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                 {risks.sort((a,b) => (b.prob*b.impact) - (a.prob*a.impact)).map(r => (
                                     <div key={r.id} className="border-b border-gray-200 pb-3">
                                         <div className="flex justify-between font-bold text-sm">
                                             <span>{r.id}: {r.name}</span>
                                             <span className={clsx(
                                                 "px-2 py-0.5 text-xs rounded-sm text-white",
                                                 r.prob*r.impact >= 20 ? "bg-red-600" :
                                                 r.prob*r.impact >= 12 ? "bg-orange-500" : "bg-green-600"
                                             )}>{r.prob * r.impact}</span>
                                         </div>
                                         <div className="text-xs text-gray-500 mt-1 font-mono">P:{r.prob} × I:{r.impact}</div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    </div>
                )}

                {tab === 'simulation' && (
                    <div className="flex gap-4 h-full">
                        <div className="w-64 bg-white border border-sys-black shadow-sm flex flex-col">
                            <div className="bg-[var(--sys-teal)] text-white px-3 py-2 font-bold text-sm border-b border-sys-black">Parameters</div>
                            <div className="p-4 space-y-4 overflow-y-auto text-xs font-mono">
                                <div>
                                    <label className="block text-gray-500 mb-1">Iterations</label>
                                    <input type="number" className="w-full border border-sys-black p-1" value={params.iterations} onChange={e => setParams({...params, iterations: +e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-gray-500 mb-1">Monsoon Risk Prob</label>
                                    <input type="number" step="0.01" className="w-full border border-sys-black p-1" value={params.monsoonProb} onChange={e => setParams({...params, monsoonProb: +e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-gray-500 mb-1">Supplier Fail Prob</label>
                                    <input type="number" step="0.01" className="w-full border border-sys-black p-1" value={params.supplierFailProb} onChange={e => setParams({...params, supplierFailProb: +e.target.value})} />
                                </div>
                                <button 
                                    className="w-full bg-[var(--sys-amber)] text-sys-black py-2 font-bold font-sans border border-sys-black shadow-sm active:translate-y-px"
                                    onClick={handleRun}
                                >
                                    {running ? 'Running...' : 'Run Simulation'}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-white border border-sys-black shadow-sm flex flex-col">
                             <div className="bg-[var(--sys-teal)] text-white px-3 py-2 font-bold text-sm border-b border-sys-black">Monte Carlo Financial Distribution</div>
                             
                             {result ? (
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="grid grid-cols-4 gap-4 mb-6 shrink-0">
                                        <div className="border border-sys-black p-3 bg-gray-50">
                                            <div className="text-xs text-gray-500 font-bold mb-1">Mean Loss</div>
                                            <div className="text-xl font-mono text-sys-black">₹{result.totalCostMean.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                                        </div>
                                        <div className="border border-sys-black p-3 bg-gray-50">
                                            <div className="text-xs text-gray-500 font-bold mb-1">P50 (Median)</div>
                                            <div className="text-xl font-mono text-blue-700">₹{result.p50.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                                        </div>
                                        <div className="border border-sys-black p-3 bg-red-50 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] px-1 font-bold">Tail Risk</div>
                                            <div className="text-xs text-red-800 font-bold mb-1">P90 (Worst 10%)</div>
                                            <div className="text-xl font-mono text-red-700 font-bold">₹{result.p90.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                                        </div>
                                        <div className="border border-sys-black p-3 bg-[var(--sys-teal)] text-white">
                                            <div className="text-xs opacity-80 font-bold mb-1">Stockout Prob</div>
                                            <div className="text-xl font-mono font-bold">{(result.stockoutProb * 100).toFixed(1)}%</div>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-h-[200px]">
                                        <Bar 
                                            data={getChartData()} 
                                            options={{
                                                maintainAspectRatio: false,
                                                plugins: { legend: { display: false } },
                                                scales: { y: { display: false } }
                                            }}
                                        />
                                    </div>
                                </div>
                             ) : (
                                <div className="flex-1 flex items-center justify-center text-gray-400 font-mono">
                                    Awaiting Execution...
                                </div>
                             )}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Orion Embedded Agent Panel */}
        {orionOpen && (
            <div className="w-72 bg-white border-l border-sys-black flex flex-col shadow-[-4px_0_15px_rgba(0,0,0,0.05)] z-20 shrink-0">
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
                <div className="flex-1 p-4 overflow-y-auto text-sm font-sans space-y-5">
                    
                    <div className="bg-gray-50 border border-sys-black/10 p-2 rounded-sm">
                        <div className="text-[10px] text-gray-500 font-mono mb-1 border-b border-gray-200 pb-1">ORION EXECUTION TRACE</div>
                        <div className="space-y-1.5 font-mono text-[10px] mt-2">
                            <div className="flex gap-2 text-green-700"><span>✓</span> <span>Loaded network topology</span></div>
                            <div className="flex gap-2 text-green-700"><span>✓</span> <span>Executed {params.iterations.toLocaleString()} Monte Carlo runs</span></div>
                            <div className="flex gap-2 text-green-700"><span>✓</span> <span>Calculated P50/P90 loss profiles</span></div>
                            <div className="flex gap-2 text-blue-600 animate-pulse"><span>●</span> <span>Awaiting user action...</span></div>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-[var(--sys-teal)] mb-1">Risk Summary</h4>
                        <p className="text-gray-700 text-xs leading-relaxed">
                            Orion has simulated structural and weather risks across the supply chain. 
                        </p>
                    </div>

                    {result && (
                        <div className="bg-red-50 border border-red-300 p-3 text-xs">
                            <strong className="block mb-2 text-red-700">Tail Risk Detected</strong>
                            Your P90 loss exposure is <strong className="font-bold">₹{result.p90.toLocaleString(undefined, {maximumFractionDigits:0})}</strong>. 
                            There is a {(result.stockoutProb * 100).toFixed(1)}% probability of an inventory stockout under the current safety stock parameters.
                            
                            <button className="w-full mt-3 bg-red-600 text-white py-2 font-bold shadow-sm hover:brightness-110 transition-all border border-sys-black" onClick={() => {
                                const enqueue = useGovernanceStore.getState().enqueue;
                                const openWindow = useOSStore.getState().openWindow;
                                const res = enqueue(
                                    'change safety-stock policy',
                                    'Orion Orchestrator',
                                    { context: 'P90 Loss Exposure', amount: result.p90 },
                                    { stockoutProb: `${(result.stockoutProb * 100).toFixed(1)}%` },
                                    { stockoutProb: '5.0%' }
                                );
                                if (res.success) {
                                    alert("Sent to Governance. Opening Inventory Lab.");
                                    if(openWindow) openWindow('inventory-lab', 'Inventory Lab');
                                } else {
                                    alert(`Governance Blocked: ${res.reason}`);
                                }
                            }}>
                                Send to Inventory Lab
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}
        {!orionOpen && (
            <div 
                className="w-8 bg-gray-100 border-l border-sys-black flex flex-col items-center py-2 cursor-pointer hover:bg-gray-200 shrink-0"
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
