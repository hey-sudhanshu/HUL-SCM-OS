import React, { useState, useEffect } from 'react';
import { score_kraljic, DEFAULT_WEIGHTS, KraljicWeights, KraljicScore } from '../../../lib/kraljic';
import { useGovernanceStore } from '../../../lib/governanceStore';
import { fetchNetworkData } from '@/lib/api';
import clsx from 'clsx';

export const VendorManager = ({ onClose }: { onClose?: () => void }) => {
  const [weights, setWeights] = useState<KraljicWeights>(DEFAULT_WEIGHTS);
  const [scores, setScores] = useState<KraljicScore[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<KraljicScore | null>(null);
  const [orionOpen, setOrionOpen] = useState(true);

  const [materials, setMaterials] = useState<any[]>([]);
  useEffect(() => { fetchNetworkData().then(d => setMaterials(d.materials || [])); }, []);
  const gov = useGovernanceStore();

  useEffect(() => {
    if (materials.length > 0) {
      setScores(score_kraljic(materials, weights));
    }
  }, [materials, weights]);

  const handleUplift = (mat: KraljicScore) => {
    gov.enqueue(
      'change safety-stock policy', 
      'Orion Vendor Agent', 
      { material: mat.materialId, action: 'uplift_bottleneck_ss', factor: 1.5 },
      { safetyStock: 'baseline' },
      { safetyStock: 'baseline * 1.5', holdingCost: 'higher' }
    );
    alert('Orion drafted request to uplift Safety Stock in Governance Queue.');
  };

  const counts = scores.reduce((acc, s) => {
    acc[s.quadrant]++; return acc;
  }, { Strategic: 0, Leverage: 0, Bottleneck: 0, 'Non-critical': 0 });

  return (
    <div className="flex w-full h-full bg-sys-bg text-sys-black font-sans">
      <div className="flex-1 flex flex-col p-4 overflow-hidden gap-4">
        
        {/* KPI Strip */}
        <div className="flex gap-4 shrink-0">
           {Object.entries(counts).map(([k, v]) => (
             <div key={k} className="flex-1 bg-white border border-sys-black p-3 shadow-sm flex items-center justify-between">
                <span className="font-bold text-sm">{k}</span>
                <span className={clsx("text-xl font-mono", k === 'Bottleneck' && v > 0 ? "text-red-600 font-bold" : "text-gray-500")}>{v}</span>
             </div>
           ))}
        </div>

        {/* Main Content */}
        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Kraljic Matrix Chart (CSS Grid) */}
          <div className="w-1/2 bg-white border border-sys-black flex flex-col relative shadow-sm">
            <div className="bg-[var(--sys-teal)] text-white px-3 py-2 font-bold text-sm border-b border-sys-black">Kraljic Matrix</div>
            <div className="flex-1 relative m-4 border-2 border-sys-black bg-gray-50 overflow-hidden">
              <div className="absolute top-0 left-0 w-1/2 h-1/2 border-r-2 border-b-2 border-sys-black/20 flex items-center justify-center font-bold text-gray-300 pointer-events-none">LEVERAGE</div>
              <div className="absolute top-0 right-0 w-1/2 h-1/2 border-b-2 border-sys-black/20 flex items-center justify-center font-bold text-gray-300 pointer-events-none">STRATEGIC</div>
              <div className="absolute bottom-0 left-0 w-1/2 h-1/2 border-r-2 border-sys-black/20 flex items-center justify-center font-bold text-gray-300 pointer-events-none">NON-CRITICAL</div>
              <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-red-500/10 flex items-center justify-center font-bold text-red-300 pointer-events-none">BOTTLENECK</div>
              
              {scores.map(s => {
                const left = `${s.supplyRiskScore * 10}%`;
                const bottom = `${s.profitImpactScore * 10}%`;
                return (
                  <div 
                    key={s.materialId}
                    onClick={() => setSelectedMaterial(s)}
                    className={clsx(
                      "absolute w-4 h-4 rounded-full border border-white cursor-pointer transform -translate-x-1/2 translate-y-1/2 transition-transform hover:scale-150 shadow-sm",
                      selectedMaterial?.materialId === s.materialId ? "bg-sys-amber border-sys-black z-20 scale-150" : "bg-sys-teal z-10",
                      s.quadrant === 'Bottleneck' && "bg-red-500"
                    )}
                    style={{ left, bottom }}
                    title={s.materialId}
                  />
                );
              })}
            </div>
            {/* Axis Labels */}
            <div className="absolute left-1 bottom-1/2 transform -translate-y-1/2 -rotate-90 text-[10px] font-bold text-gray-500 tracking-widest">PROFIT IMPACT</div>
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-[10px] font-bold text-gray-500 tracking-widest">SUPPLY RISK</div>
          </div>

          {/* List & Details */}
          <div className="w-1/2 flex flex-col gap-4">
              <div className="flex-1 bg-white border border-sys-black flex flex-col shadow-sm min-h-0">
                <div className="bg-[var(--sys-teal)] text-white px-3 py-2 font-bold text-sm border-b border-sys-black">Material Portfolio</div>
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-xs font-mono text-left">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="p-2 border-b border-sys-black/20">ID</th>
                        <th className="p-2 border-b border-sys-black/20">Quadrant</th>
                        <th className="p-2 border-b border-sys-black/20">Risk</th>
                        <th className="p-2 border-b border-sys-black/20">Impact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scores.map(s => (
                        <tr 
                          key={s.materialId} 
                          onClick={() => setSelectedMaterial(s)}
                          className={clsx("cursor-pointer border-b border-sys-black/10 hover:bg-gray-50", selectedMaterial?.materialId === s.materialId && "bg-[var(--sys-amber)]/20", s.quadrant === 'Bottleneck' && "text-red-700")}
                        >
                          <td className="p-2">{s.materialId}</td>
                          <td className="p-2">{s.quadrant}</td>
                          <td className="p-2">{s.supplyRiskScore.toFixed(1)}</td>
                          <td className="p-2">{s.profitImpactScore.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Kraljic Weights Sliders */}
              <div className="bg-white border border-sys-black p-3 shadow-sm shrink-0">
                  <h3 className="font-bold text-sm border-b border-sys-black pb-1 mb-2">Kraljic Strategy Weights</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                          <div className="flex justify-between mb-1"><span>Concentration</span> <span>{weights.supplyRisk.supplierConcentration.toFixed(1)}</span></div>
                          <input type="range" min="0" max="1" step="0.1" value={weights.supplyRisk.supplierConcentration} onChange={e => setWeights({...weights, supplyRisk: {...weights.supplyRisk, supplierConcentration: Number(e.target.value)}})} className="w-full" />
                      </div>
                      <div>
                          <div className="flex justify-between mb-1"><span>Geo Risk</span> <span>{weights.supplyRisk.geographicExposure.toFixed(1)}</span></div>
                          <input type="range" min="0" max="1" step="0.1" value={weights.supplyRisk.geographicExposure} onChange={e => setWeights({...weights, supplyRisk: {...weights.supplyRisk, geographicExposure: Number(e.target.value)}})} className="w-full" />
                      </div>
                      <div>
                          <div className="flex justify-between mb-1"><span>Norm Spend</span> <span>{weights.profitImpact.shareOfSpend.toFixed(1)}</span></div>
                          <input type="range" min="0" max="1" step="0.1" value={weights.profitImpact.shareOfSpend} onChange={e => setWeights({...weights, profitImpact: {...weights.profitImpact, shareOfSpend: Number(e.target.value)}})} className="w-full" />
                      </div>
                      <div>
                          <div className="flex justify-between mb-1"><span>Revenue Crit</span> <span>{weights.profitImpact.revenueCriticality.toFixed(1)}</span></div>
                          <input type="range" min="0" max="1" step="0.1" value={weights.profitImpact.revenueCriticality} onChange={e => setWeights({...weights, profitImpact: {...weights.profitImpact, revenueCriticality: Number(e.target.value)}})} className="w-full" />
                      </div>
                  </div>
              </div>
          </div>
        </div>
      </div>

      {/* Orion Embedded Agent Panel */}
      {orionOpen && (
          <div className="w-72 bg-white border-l border-sys-black flex flex-col shadow-[-4px_0_15px_rgba(0,0,0,0.05)] z-10 shrink-0">
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
              <div className="flex-1 p-3 overflow-y-auto text-sm font-sans space-y-4">
                  <div className="bg-gray-50 border border-sys-black/10 p-2 rounded-sm">
                      <div className="text-xs text-gray-500 font-mono mb-1 border-b border-gray-200 pb-1">ORION EXECUTION TRACE</div>
                      <div className="space-y-1.5 font-mono text-[10px] mt-2">
                          <div className="flex gap-2 text-green-700"><span>✓</span> <span>Loaded network materials</span></div>
                          <div className="flex gap-2 text-green-700"><span>✓</span> <span>Invoked `score_kraljic`</span></div>
                          <div className="flex gap-2 text-green-700"><span>✓</span> <span>Identified {counts.Bottleneck} Bottlenecks</span></div>
                          <div className="flex gap-2 text-blue-600 animate-pulse"><span>●</span> <span>Awaiting user action...</span></div>
                      </div>
                  </div>

                  <div>
                      <h4 className="font-bold text-[var(--sys-teal)] mb-1">Agent Summary</h4>
                      <p className="text-gray-700 text-xs leading-relaxed">
                          Orion has evaluated the supplier portfolio. You currently have <strong className="text-red-600">{counts.Bottleneck} Bottleneck</strong> materials with high supply risk and low profit impact. 
                          These items threaten production continuity.
                      </p>
                  </div>

                  {selectedMaterial?.quadrant === 'Bottleneck' && (
                      <div className="bg-red-50 border border-red-300 p-2 text-xs">
                          <strong className="block mb-1 text-red-700">Mitigation: {selectedMaterial.materialId}</strong>
                          Orion recommends uplifting the Safety Stock policy in Inventory Lab to protect against disruption.
                          <button onClick={() => handleUplift(selectedMaterial)} className="w-full mt-2 bg-red-600 text-white py-1.5 font-bold shadow-sm hover:brightness-110 transition-all border border-sys-black">
                              Request SS Uplift via Governance
                          </button>
                      </div>
                  )}
                  {selectedMaterial && selectedMaterial.quadrant !== 'Bottleneck' && (
                       <div className="bg-[var(--sys-amber)]/20 border border-[var(--sys-amber)] p-2 text-xs">
                         <strong className="block mb-1 text-sys-black">Selected: {selectedMaterial.materialId} ({selectedMaterial.quadrant})</strong>
                         No immediate mitigation required. Monitor supplier performance regularly.
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
