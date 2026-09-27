'use client';

import React, { useEffect, useState } from 'react';
import { Factory, AlertCircle, Info } from 'lucide-react';
import { fetchNetworkData } from '@/lib/api';
import { formatCurrency, formatNumber, formatPercent, safeValue } from '@/lib/format';

interface Material {
  id: string;
  material_group: string;
  annual_spend: number;
  supplier_count: number;
  switching_cost: number;
  lead_time_days: number;
  is_single_source: boolean;
  share_of_spend: number;
  effect_on_product_cost: number;
  revenue_criticality: number;
}

export default function VendorManager() {
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMat, setSelectedMat] = useState<Material | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchNetworkData();
        setMaterials(data.materials || []);
      } catch (err) {
        console.error('Failed to load materials data', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900 text-slate-300 font-mono">
        LOADING SUPPLY BASE...
      </div>
    );
  }

  // KPIs
  const totalMaterials = materials.length;
  const singleSourceCount = materials.filter(m => m.is_single_source).length;
  const totalSpend = materials.reduce((s, m) => s + (m.annual_spend || 0), 0);
  const avgLeadTime = materials.length 
    ? materials.reduce((s, m) => s + (m.lead_time_days || 0), 0) / materials.length 
    : 0;

  // Kraljic Helpers
  const getImpact = (m: Material) => {
    // 0 to 1 scale
    return Math.min(1, Math.max(0, (m.effect_on_product_cost || 0.5) * (m.revenue_criticality || 0.5)));
  };

  const getRisk = (m: Material) => {
    // 0 to 1 scale
    if (m.is_single_source) return 0.8;
    const supCount = m.supplier_count || 1;
    return Math.min(1, Math.max(0, 0.3 + (1 / supCount) * 0.5));
  };

  const getQuadrant = (impact: number, risk: number) => {
    if (impact >= 0.5 && risk >= 0.5) return 'Strategic';
    if (impact < 0.5 && risk >= 0.5) return 'Bottleneck';
    if (impact >= 0.5 && risk < 0.5) return 'Leverage';
    return 'Non-Critical';
  };

  const getQuadrantColor = (quad: string) => {
    switch (quad) {
      case 'Strategic': return 'bg-red-500';
      case 'Bottleneck': return 'bg-amber-500';
      case 'Leverage': return 'bg-blue-500';
      case 'Non-Critical': return 'bg-green-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 font-mono text-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-slate-800 bg-slate-900/50">
        <Factory className="w-5 h-5 mr-2 text-indigo-400" />
        <h1 className="text-lg font-semibold text-slate-100 tracking-wider">SUPPLY BASE — MATERIALS</h1>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-800/20">
        <div className="p-4 border-r border-slate-800">
          <div className="text-slate-500 text-xs mb-1 uppercase">Materials</div>
          <div className="text-2xl font-light text-slate-100">{formatNumber(totalMaterials)}</div>
        </div>
        <div className="p-4 border-r border-slate-800">
          <div className="text-slate-500 text-xs mb-1 uppercase">Single Source</div>
          <div className="text-2xl font-light text-amber-400 flex items-center">
            {formatNumber(singleSourceCount)}
            {singleSourceCount > 0 && <AlertCircle className="w-4 h-4 ml-2" />}
          </div>
        </div>
        <div className="p-4 border-r border-slate-800">
          <div className="text-slate-500 text-xs mb-1 uppercase">Total Spend</div>
          <div className="text-2xl font-light text-indigo-400">{formatCurrency(totalSpend)}</div>
        </div>
        <div className="p-4">
          <div className="text-slate-500 text-xs mb-1 uppercase">Avg Lead Time</div>
          <div className="text-2xl font-light text-slate-100">{safeValue(avgLeadTime, 1)}d</div>
        </div>
      </div>

      {/* Main Split */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT: Materials Table */}
        <div className="w-2/5 flex flex-col border-r border-slate-800 bg-slate-900/40">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-900 shadow-sm border-b border-slate-800 z-10">
                <tr>
                  <th className="py-3 px-3 text-xs font-medium text-slate-500">ID / GROUP</th>
                  <th className="py-3 px-3 text-xs font-medium text-slate-500 text-right">SPEND</th>
                  <th className="py-3 px-3 text-xs font-medium text-slate-500 text-right">SUPS</th>
                  <th className="py-3 px-3 text-xs font-medium text-slate-500 text-right">LT(d)</th>
                  <th className="py-3 px-3 text-xs font-medium text-slate-500 text-center">SRC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {materials.map(m => (
                  <tr 
                    key={m.id} 
                    onClick={() => setSelectedMat(m)}
                    className={`cursor-pointer hover:bg-slate-800/50 transition-colors ${selectedMat?.id === m.id ? 'bg-indigo-900/20 border-l-2 border-l-indigo-500' : 'border-l-2 border-l-transparent'}`}
                  >
                    <td className="py-2 px-3">
                      <div className="text-slate-200">{m.id}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[120px]" title={m.material_group}>{m.material_group}</div>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">{formatCurrency(m.annual_spend)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{m.supplier_count}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{m.lead_time_days}</td>
                    <td className="py-2 px-3 text-center">
                      {m.is_single_source ? (
                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px] border border-amber-500/30">1SRC</span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-slate-500/20 text-slate-400 rounded text-[10px] border border-slate-500/30">MULTI</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: Visuals & Detail */}
        <div className="flex-1 flex flex-col bg-slate-900/20 overflow-hidden">
          
          {/* TOP: Kraljic Matrix (60%) */}
          <div className="h-[60%] flex flex-col border-b border-slate-800 p-4">
            <h2 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Kraljic Portfolio Matrix</h2>
            <div className="flex-1 relative border-l-2 border-b-2 border-slate-600 bg-slate-950 rounded-tr rounded-bl">
              
              {/* Grid Lines */}
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-700/50 border-r border-dashed border-slate-500"></div>
              <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-700/50 border-b border-dashed border-slate-500"></div>

              {/* Labels */}
              <div className="absolute top-2 left-2 text-xs text-amber-500/70 font-semibold tracking-widest uppercase">Bottleneck</div>
              <div className="absolute top-2 right-2 text-xs text-red-500/70 font-semibold tracking-widest uppercase">Strategic</div>
              <div className="absolute bottom-2 left-2 text-xs text-green-500/70 font-semibold tracking-widest uppercase">Non-Critical</div>
              <div className="absolute bottom-2 right-2 text-xs text-blue-500/70 font-semibold tracking-widest uppercase">Leverage</div>
              
              {/* Axes Labels */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-[10px] text-slate-500 uppercase">Business Impact &rarr;</div>
              <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 -rotate-90 text-[10px] text-slate-500 uppercase">&larr; Supply Risk</div>

              {/* Dots */}
              {materials.map(m => {
                const impact = getImpact(m);
                const risk = getRisk(m);
                const quad = getQuadrant(impact, risk);
                const isSelected = selectedMat?.id === m.id;
                
                return (
                  <div 
                    key={m.id}
                    onClick={() => setSelectedMat(m)}
                    className={`absolute rounded-full cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all ${getQuadrantColor(quad)} ${isSelected ? 'w-4 h-4 ring-2 ring-white z-20' : 'w-2 h-2 opacity-70 hover:opacity-100 z-10'}`}
                    style={{
                      left: `${impact * 100}%`,
                      bottom: `${risk * 100}%`
                    }}
                    title={`${m.id} - ${m.material_group}`}
                  />
                )
              })}
            </div>
          </div>

          {/* BOTTOM: Detail (40%) */}
          <div className="h-[40%] p-4 overflow-auto bg-slate-900/60">
            {selectedMat ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-slate-100">{selectedMat.id}</h3>
                    <p className="text-sm text-slate-400">{selectedMat.material_group}</p>
                  </div>
                  <div className={`px-3 py-1 rounded text-xs font-semibold ${
                    getQuadrant(getImpact(selectedMat), getRisk(selectedMat)) === 'Strategic' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    getQuadrant(getImpact(selectedMat), getRisk(selectedMat)) === 'Bottleneck' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    getQuadrant(getImpact(selectedMat), getRisk(selectedMat)) === 'Leverage' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    'bg-green-500/20 text-green-400 border border-green-500/30'
                  }`}>
                    {getQuadrant(getImpact(selectedMat), getRisk(selectedMat)).toUpperCase()}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Annual Spend</div>
                    <div className="text-slate-200">{formatCurrency(selectedMat.annual_spend)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Supplier Count</div>
                    <div className="text-slate-200">{selectedMat.supplier_count}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Lead Time</div>
                    <div className="text-slate-200">{selectedMat.lead_time_days} days</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Sourcing</div>
                    <div className={selectedMat.is_single_source ? "text-amber-400" : "text-green-400"}>
                      {selectedMat.is_single_source ? 'Single Source' : 'Multi-Source'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Switching Cost</div>
                    <div className="text-slate-200">{formatCurrency(selectedMat.switching_cost)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Spend Share</div>
                    <div className="text-slate-200">{formatPercent(selectedMat.share_of_spend)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Product Cost Effect</div>
                    <div className="text-slate-200">{safeValue(selectedMat.effect_on_product_cost, 2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Rev Criticality</div>
                    <div className="text-slate-200">{safeValue(selectedMat.revenue_criticality, 2)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <Info className="w-8 h-8 mb-2 opacity-50" />
                <p>Select a material to view details</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
