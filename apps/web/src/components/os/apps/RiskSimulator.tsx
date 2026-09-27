'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, Info } from 'lucide-react';
import { fetchNetworkData } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/format';

interface Risk {
  id: string;
  name: string;
  likelihood: number;
  impact: number;
  category: string;
  owner: string;
  mitigation: string;
}

export default function RiskSimulator() {
  const [loading, setLoading] = useState(true);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchNetworkData();
        setRisks(data.risks || []);
      } catch (err) {
        console.error('Failed to load risk data', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900 text-slate-300 font-mono">
        LOADING RISK SIMULATOR...
      </div>
    );
  }

  // KPIs
  const totalRisks = risks.length;
  
  // Medians & Metrics
  const impacts = risks.map(r => r.impact).sort((a,b) => a-b);
  const medianImpact = impacts.length ? impacts[Math.floor(impacts.length / 2)] : 0;
  
  const highImpactCount = risks.filter(r => r.impact > medianImpact).length;
  const expectedLoss = risks.reduce((sum, r) => sum + (r.likelihood * r.impact), 0);
  
  const categories = Array.from(new Set(risks.map(r => r.category)));
  const categoryCount = categories.length;

  // Grid Bucketing
  // We divide likelihood (0-1) into 5 buckets (0.2 each)
  // We divide impact into 5 buckets relative to the max impact
  const maxImpact = Math.max(...risks.map(r => r.impact), 1);

  const getLikelihoodBucket = (l: number) => {
    if (l < 0.2) return 0;
    if (l < 0.4) return 1;
    if (l < 0.6) return 2;
    if (l < 0.8) return 3;
    return 4;
  };

  const getImpactBucket = (i: number) => {
    const ratio = i / maxImpact;
    if (ratio < 0.2) return 0;
    if (ratio < 0.4) return 1;
    if (ratio < 0.6) return 2;
    if (ratio < 0.8) return 3;
    return 4;
  };

  const matrix: Risk[][][] = Array(5).fill(null).map(() => Array(5).fill(null).map(() => []));
  
  risks.forEach(r => {
    const rIdx = getLikelihoodBucket(r.likelihood); // y-axis
    const cIdx = getImpactBucket(r.impact); // x-axis
    matrix[rIdx][cIdx].push(r);
  });

  const getCellColor = (rIdx: number, cIdx: number) => {
    const score = rIdx + cIdx;
    if (score <= 2) return 'bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30';
    if (score <= 5) return 'bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30';
    return 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30';
  };

  const likelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
  const impactLabels = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];

  // Category breakdown
  const categoryStats = categories.map(cat => {
    const catRisks = risks.filter(r => r.category === cat);
    return {
      category: cat,
      count: catRisks.length,
      expectedLoss: catRisks.reduce((s, r) => s + (r.likelihood * r.impact), 0)
    };
  }).sort((a,b) => b.expectedLoss - a.expectedLoss);

  const maxCatLoss = Math.max(...categoryStats.map(c => c.expectedLoss), 1);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 font-mono text-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-slate-800 bg-slate-900/50">
        <ShieldAlert className="w-5 h-5 mr-2 text-rose-400" />
        <h1 className="text-lg font-semibold text-slate-100 tracking-wider">RISK SIMULATOR</h1>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-800/20">
        <div className="p-4 border-r border-slate-800">
          <div className="text-slate-500 text-xs mb-1 uppercase">Total Risks</div>
          <div className="text-2xl font-light text-slate-100">{formatNumber(totalRisks)}</div>
        </div>
        <div className="p-4 border-r border-slate-800">
          <div className="text-slate-500 text-xs mb-1 uppercase">High Impact</div>
          <div className="text-2xl font-light text-amber-400">{formatNumber(highImpactCount)}</div>
        </div>
        <div className="p-4 border-r border-slate-800">
          <div className="text-slate-500 text-xs mb-1 uppercase">Expected Loss</div>
          <div className="text-2xl font-light text-rose-400">{formatCurrency(expectedLoss)}</div>
        </div>
        <div className="p-4">
          <div className="text-slate-500 text-xs mb-1 uppercase">Categories</div>
          <div className="text-2xl font-light text-slate-100">{formatNumber(categoryCount)}</div>
        </div>
      </div>

      {/* Main Split */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT: Risk Matrix */}
        <div className="w-1/2 p-6 border-r border-slate-800 bg-slate-900/40 flex flex-col">
          <h2 className="text-sm font-medium text-slate-400 mb-6 uppercase tracking-wider text-center">Risk Heatmap</h2>
          
          <div className="flex-1 flex relative ml-8 mb-8">
            {/* Y-axis label */}
            <div className="absolute -left-10 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs text-slate-500 uppercase tracking-widest whitespace-nowrap">
              Likelihood &rarr;
            </div>

            {/* Matrix */}
            <div className="flex-1 grid grid-rows-5 gap-1">
              {[4, 3, 2, 1, 0].map(rIdx => (
                <div key={`row-${rIdx}`} className="flex gap-1">
                  {/* Row label */}
                  <div className="w-24 flex items-center justify-end pr-3 text-[10px] text-slate-500 uppercase text-right leading-tight">
                    {likelihoodLabels[rIdx]}
                  </div>
                  
                  {/* Cells */}
                  {[0, 1, 2, 3, 4].map(cIdx => {
                    const cellRisks = matrix[rIdx][cIdx];
                    const hasSelection = cellRisks.some(r => r.id === selectedRisk?.id);
                    
                    return (
                      <div 
                        key={`cell-${rIdx}-${cIdx}`}
                        className={`flex-1 border rounded flex flex-col items-center justify-center cursor-pointer transition-all ${getCellColor(rIdx, cIdx)} ${hasSelection ? 'ring-2 ring-white shadow-lg shadow-black/50 z-10 scale-105' : 'opacity-80'}`}
                        onClick={() => {
                          if (cellRisks.length > 0) {
                            setSelectedRisk(cellRisks[0]);
                          } else {
                            setSelectedRisk(null);
                          }
                        }}
                      >
                        {cellRisks.length > 0 && (
                          <span className="text-lg font-bold">{cellRisks.length}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* X-axis labels */}
              <div className="flex gap-1 mt-2">
                <div className="w-24 shrink-0"></div>
                {[0, 1, 2, 3, 4].map(cIdx => (
                  <div key={`col-label-${cIdx}`} className="flex-1 text-center text-[10px] text-slate-500 uppercase leading-tight pt-1">
                    {impactLabels[cIdx]}
                  </div>
                ))}
              </div>
            </div>
            
            {/* X-axis main label */}
            <div className="absolute -bottom-10 left-[6rem] right-0 text-center text-xs text-slate-500 uppercase tracking-widest">
              Impact &rarr;
            </div>
          </div>
        </div>

        {/* RIGHT: Details & Categories */}
        <div className="w-1/2 flex flex-col bg-slate-900/20 overflow-hidden">
          
          {/* TOP: Selected Risk Detail */}
          <div className="h-1/2 border-b border-slate-800 p-6 overflow-auto">
            {selectedRisk ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-medium text-slate-100">{selectedRisk.name}</h3>
                    <div className="text-sm text-slate-400 mt-1">{selectedRisk.id} — Owned by {selectedRisk.owner}</div>
                  </div>
                  <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300 border border-slate-700">
                    {selectedRisk.category}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/50">
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase mb-1">Likelihood</div>
                    <div className="text-lg text-slate-200">{(selectedRisk.likelihood * 100).toFixed(1)}%</div>
                  </div>
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase mb-1">Impact</div>
                    <div className="text-lg text-slate-200">{formatCurrency(selectedRisk.impact)}</div>
                  </div>
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase mb-1">Expected Loss</div>
                    <div className="text-lg text-rose-400">{formatCurrency(selectedRisk.likelihood * selectedRisk.impact)}</div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-[10px] text-slate-500 uppercase mb-2">Mitigation Strategy</div>
                  <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/30 p-3 rounded border border-slate-800/50">
                    {selectedRisk.mitigation}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <Info className="w-8 h-8 mb-3 opacity-50" />
                <p>Select a populated cell in the heatmap to view risk details</p>
              </div>
            )}
          </div>

          {/* BOTTOM: Category Breakdown */}
          <div className="h-1/2 p-6 overflow-auto">
            <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Expected Loss by Category</h3>
            <div className="space-y-4">
              {categoryStats.map(stat => (
                <div key={stat.category} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{stat.category} <span className="text-slate-500">({stat.count})</span></span>
                    <span className="text-slate-400">{formatCurrency(stat.expectedLoss)}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500/50 rounded-full transition-all duration-500"
                      style={{ width: `${(stat.expectedLoss / maxCatLoss) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
