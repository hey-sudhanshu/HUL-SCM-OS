'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useMapStore } from '@/store';
import { classify_abc_xyz, compute_inventory_policy, generate_reorder_plan, compute_holding_cost, DEFAULT_INV_CONFIG, risk_pooling } from '@/lib/inventory';
import { Line } from 'react-chartjs-2';
import clsx from 'clsx';
import { useGovernanceStore } from '@/lib/governanceStore';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export const InventoryLab: React.FC = () => {
    const { networkData, setSelectedNodeId } = useMapStore();
    const enqueue = useGovernanceStore(state => state.enqueue);
    const [activeTab, setActiveTab] = useState('Classification');
    const [selectedCell, setSelectedCell] = useState<string | null>('AY');
    const [selectedSku, setSelectedSku] = useState<string | null>(null);
    const [orionOpen, setOrionOpen] = useState(true);

    const { classifications, policies, plan, baseline, gridData } = useMemo(() => {
        if (!networkData) return { classifications: { classifications: [] }, policies: {}, plan: [], baseline: null, gridData: null };
        const config = DEFAULT_INV_CONFIG;
        const cls = classify_abc_xyz(networkData.skus, networkData.demand_history, config).outputs;
        const costParams = networkData.cost_parameters || { order_cost: 50, holding_cost_rate: 0.2 };
        
        const pol: any = {};
        let baseVal = 0, optVal = 0, baseHC = 0, optHC = 0;
        
        cls.classifications.forEach((c: any) => {
            const sku = networkData.skus.find((s: any) => s.id === c.sku_id);
            if (!sku) return;
            const res = compute_inventory_policy(sku, c.class, c.mean, c.stdDev, 3, 1, costParams, 0.95).outputs;
            pol[c.sku_id] = res;

            const qtyBase = c.mean * 30; 
            const qtyOpt = res.ss + res.eoq/2;
            baseVal += qtyBase * sku.unit_cost;
            optVal += qtyOpt * sku.unit_cost;
            baseHC += compute_holding_cost(sku, qtyBase, costParams).outputs.total;
            optHC += compute_holding_cost(sku, qtyOpt, costParams).outputs.total;
        });

        const reorderPlan = generate_reorder_plan(networkData.inventory_snapshot || [], pol).outputs.plan;

        const grid: any = { AX: [], AY: [], AZ: [], BX: [], BY: [], BZ: [], CX: [], CY: [], CZ: [] };
        cls.classifications.forEach((c: any) => {
            grid[c.class].push(c);
        });

        return { classifications: cls, policies: pol, plan: reorderPlan, baseline: { baseVal, optVal, baseHC, optHC }, gridData: grid };
    }, [networkData]);

    if (!networkData) return <div className="p-4 font-mono">Loading Orion Inventory Data...</div>;

    const handleReorderClick = (sku: string, cfa: string) => {
        const res = enqueue(
            'approve reorder',
            'Inventory Lab',
            { sku, location: cfa },
            { stock: 'Below ROP' },
            { stock: 'Replenishing' }
        );
        if (res.success) {
            alert(`Reorder for ${sku} sent to Governance Queue.`);
        } else {
            alert(`Governance Blocked: ${res.reason}`);
        }
    };

    return (
        <div className="flex h-full w-full bg-sys-bg text-sys-black font-sans">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="flex border-b border-sys-black bg-white overflow-x-auto shrink-0">
                    {['Classification', 'Reorder Plan', 'Baseline Comparison', 'Risk Pooling'].map(t => (
                        <div 
                            key={t}
                            onClick={() => setActiveTab(t)}
                            className={clsx(
                                "px-4 py-2 cursor-pointer border-r border-sys-black text-sm font-semibold whitespace-nowrap transition-colors",
                                activeTab === t ? "bg-[var(--sys-teal)] text-white" : "hover:bg-gray-100"
                            )}
                        >
                            {t}
                        </div>
                    ))}
                </div>

                <div className="flex-1 overflow-auto p-4">
                    {activeTab === 'Classification' && (
                        <div className="flex gap-4 h-full">
                            <div className="w-1/2 flex flex-col gap-2">
                                <h3 className="font-bold text-lg mb-2">ABC-XYZ 9-Cell Grid</h3>
                                <div className="grid grid-cols-3 grid-rows-3 flex-1 border border-sys-black bg-gray-200 gap-[1px]">
                                    {['AX', 'AY', 'AZ', 'BX', 'BY', 'BZ', 'CX', 'CY', 'CZ'].map(cell => (
                                        <div 
                                            key={cell}
                                            onClick={() => { setSelectedCell(cell); setSelectedSku(null); }}
                                            className={clsx(
                                                "p-2 bg-white cursor-pointer transition-colors flex flex-col justify-between",
                                                selectedCell === cell && "ring-2 ring-inset ring-[var(--sys-amber)] bg-yellow-50"
                                            )}
                                        >
                                            <div className="font-bold text-lg">{cell}</div>
                                            <div className="text-sm font-mono text-gray-500">{gridData[cell]?.length || 0} SKUs</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="w-1/2 border border-sys-black bg-white flex flex-col overflow-hidden">
                                <div className="bg-[var(--sys-teal)] text-white px-3 py-2 font-bold text-sm">
                                    {selectedCell} Portfolio Analysis
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {gridData[selectedCell || 'AY']?.map((c: any) => {
                                        const p = policies[c.sku_id];
                                        if(!p) return null;
                                        return (
                                            <div 
                                                key={c.sku_id} 
                                                onClick={() => setSelectedSku(c.sku_id)}
                                                className={clsx(
                                                    "p-3 border-b border-sys-black/10 cursor-pointer hover:bg-gray-50",
                                                    selectedSku === c.sku_id && "bg-[var(--sys-amber)]/10"
                                                )}
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-bold">{c.sku_id}</span>
                                                    <span className="text-xs font-mono bg-gray-100 px-1 border border-gray-300">Val: ₹{(c.annualValue/1000).toFixed(0)}k</span>
                                                </div>
                                                <div className="text-xs font-mono grid grid-cols-2 gap-2 text-gray-600">
                                                    <div>SS: {p.ss.toFixed(0)}</div>
                                                    <div>EOQ: {p.eoq.toFixed(0)}</div>
                                                    <div className="col-span-2">Policy: {p.policy_type}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Reorder Plan' && (
                        <div className="h-full flex flex-col bg-white border border-sys-black">
                            <div className="bg-[var(--sys-teal)] text-white px-3 py-2 font-bold text-sm flex justify-between items-center">
                                <span>Network Reorder Exceptions</span>
                                <div className="flex gap-2">
                                    <button className="px-2 py-0.5 bg-[var(--sys-amber)] text-black text-xs font-bold rounded-sm">FEFO Alert</button>
                                    <button className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-sm hover:bg-white/30 transition-colors">Excess Stock</button>
                                </div>
                            </div>
                            <div className="overflow-auto flex-1">
                                <table className="w-full text-sm font-mono text-left border-collapse">
                                    <thead className="bg-gray-100 sticky top-0 shadow-sm">
                                        <tr>
                                            <th className="border-b border-sys-black/20 p-2 font-semibold">SKU</th>
                                            <th className="border-b border-sys-black/20 p-2 font-semibold">Node</th>
                                            <th className="border-b border-sys-black/20 p-2 font-semibold">Exception</th>
                                            <th className="border-b border-sys-black/20 p-2 font-semibold">Avail</th>
                                            <th className="border-b border-sys-black/20 p-2 font-semibold">ROP</th>
                                            <th className="border-b border-sys-black/20 p-2 font-semibold">Order</th>
                                            <th className="border-b border-sys-black/20 p-2 font-semibold">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {plan.slice(0,25).map((r: any, idx: number) => (
                                            <tr key={idx} className={clsx(
                                                "border-b border-sys-black/10 hover:bg-gray-50",
                                                r.story === 'Near Expiry (FEFO)' ? 'bg-orange-50' : r.urgency < 0.5 ? 'bg-red-50' : ''
                                            )}>
                                                <td className="p-2 font-medium">{r.sku_id}</td>
                                                <td className="p-2 cursor-pointer text-blue-600 hover:underline" onClick={() => setSelectedNodeId(r.cfa_id)}>{r.cfa_id}</td>
                                                <td className="p-2 text-xs">{r.story}</td>
                                                <td className="p-2">{r.available}</td>
                                                <td className="p-2 text-gray-500">{r.rop.toFixed(0)}</td>
                                                <td className="p-2 font-bold">{r.order_qty.toFixed(0)}</td>
                                                <td className="p-2">
                                                    <button onClick={() => handleReorderClick(r.sku_id, r.cfa_id)} className="bg-[var(--sys-teal)] text-white px-2 py-1 text-xs rounded-sm hover:brightness-110">Request Approval</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Baseline Comparison' && (
                        <div className="h-full bg-white border border-sys-black flex flex-col">
                            <div className="bg-[var(--sys-teal)] text-white px-3 py-2 font-bold text-sm">
                                Network-wide Inventory Capital Impact
                            </div>
                            <div className="p-6 grid grid-cols-2 gap-6 font-mono text-base flex-1">
                                <div className="border border-sys-black p-5 bg-gray-50 relative flex flex-col justify-center">
                                    <div className="absolute top-0 right-0 bg-gray-200 text-xs border-b border-l border-sys-black px-2 py-1">Historical</div>
                                    <strong className="text-lg mb-4 text-gray-700">Baseline (Fixed 30-Day Cover)</strong>
                                    <div className="mb-2">Capital Locked: <span className="text-xl">₹{((baseline?.baseVal || 0) / 1000000).toFixed(2)} M</span></div>
                                    <div>Holding Cost: <span className="text-xl">₹{((baseline?.baseHC || 0) / 1000000).toFixed(2)} M</span></div>
                                </div>
                                <div className="border border-[var(--sys-teal)] p-5 bg-teal-50 relative flex flex-col justify-center shadow-[4px_4px_0_var(--sys-teal)]">
                                    <div className="absolute top-0 right-0 bg-[var(--sys-amber)] text-sys-black font-bold text-xs border-b border-l border-sys-black px-2 py-1">Orion Live Solver</div>
                                    <strong className="text-lg mb-4 text-[var(--sys-teal)]">Optimized (Dynamic SS + Pipeline)</strong>
                                    <div className="mb-2 text-gray-800">Capital Locked: <span className="text-xl font-bold">₹{((baseline?.optVal || 0) / 1000000).toFixed(2)} M</span></div>
                                    <div className="text-gray-800">Holding Cost: <span className="text-xl font-bold">₹{((baseline?.optHC || 0) / 1000000).toFixed(2)} M</span></div>
                                </div>
                                <div className="col-span-2 p-4 bg-[var(--sys-amber)] border border-sys-black text-center flex flex-col items-center justify-center shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]">
                                    <span className="text-sm font-sans font-bold text-sys-black/80">TOTAL ANNUAL EFFICIENCY GAIN</span>
                                    <span className="text-4xl font-bold font-sans mt-1">₹{(((baseline?.baseHC || 0) - (baseline?.optHC || 0)) / 1000000).toFixed(2)} Million</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'Risk Pooling' && (
                        <div className="h-full bg-white border border-sys-black flex flex-col p-4">
                            <h3 className="font-bold text-lg mb-2">Centralized vs. Decentralized Risk Pooling</h3>
                            <div className="flex gap-4">
                                <div className="flex-1 bg-gray-50 border border-sys-black p-4">
                                    <h4 className="font-bold mb-2">Decentralized (Current)</h4>
                                    <div className="text-sm font-mono space-y-2">
                                        <div className="flex justify-between"><span>Locations:</span> <span>30 CFAs</span></div>
                                        <div className="flex justify-between"><span>Avg Variability:</span> <span className="text-red-500">High (CV &gt; 0.8)</span></div>
                                        <div className="flex justify-between"><span>Total Safety Stock:</span> <span>450,000 Units</span></div>
                                    </div>
                                </div>
                                <div className="flex-1 bg-[var(--sys-teal)]/10 border border-[var(--sys-teal)] p-4 shadow-[4px_4px_0_var(--sys-teal)]">
                                    <h4 className="font-bold text-[var(--sys-teal)] mb-2">Centralized Risk Pooling</h4>
                                    <div className="text-sm font-mono space-y-2">
                                        <div className="flex justify-between"><span>Locations:</span> <span>5 Regional Hubs</span></div>
                                        <div className="flex justify-between"><span>Avg Variability:</span> <span className="text-green-600">Low (CV &lt; 0.3)</span></div>
                                        <div className="flex justify-between font-bold"><span>Total Safety Stock:</span> <span>215,000 Units</span></div>
                                    </div>
                                    <div className="mt-4 p-2 bg-white border border-sys-black text-xs font-mono">
                                        <strong>Square Root Law of Inventory:</strong> Centralizing stock from 30 locations to 5 locations reduces safety stock by ~59% due to demand aggregation.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
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
                                <div className="flex gap-2 text-green-700"><span>✓</span> <span>Invoked `classify_abc_xyz`</span></div>
                                <div className="flex gap-2 text-green-700"><span>✓</span> <span>Invoked `compute_inventory_policy`</span></div>
                                <div className="flex gap-2 text-green-700"><span>✓</span> <span>Invoked `generate_reorder_plan`</span></div>
                                <div className="flex gap-2 text-blue-600 animate-pulse"><span>●</span> <span>Awaiting user action...</span></div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-[var(--sys-teal)] mb-1">Agent Summary</h4>
                            <p className="text-gray-700 text-xs leading-relaxed">
                                Orion has processed the network inventory snapshot. 
                                By switching from a fixed 30-day cover to a dynamic Reorder Point (ROP) + Safety Stock (SS) model, 
                                capital locked in inventory is reduced significantly while maintaining a 95% service level.
                            </p>
                        </div>
                        
                        {selectedSku && (
                            <div className="bg-[var(--sys-amber)]/20 border border-[var(--sys-amber)] p-2 text-xs">
                                <strong className="block mb-1 text-sys-black">Selected: {selectedSku}</strong>
                                Orion recommends shifting this item to a continuous review policy to avoid stockouts during festive surges.
                            </div>
                        )}

                        <button className="w-full bg-[var(--sys-teal)] text-white py-1.5 font-bold shadow-sm hover:brightness-110 transition-all border border-sys-black">
                            Draft Network Approval
                        </button>
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
