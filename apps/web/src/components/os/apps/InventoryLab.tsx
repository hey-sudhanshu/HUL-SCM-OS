'use client';

import React, { useEffect, useState } from 'react';
import { Package, Search, AlertTriangle, Info } from 'lucide-react';
import { fetchNetworkData } from '@/lib/api';
import { formatCurrency, formatNumber, formatPercent, safeValue } from '@/lib/format';

interface SKU {
  id: string;
  category: string;
  brand: string;
  pack: string;
  weight_kg: number;
  unit_cost: number;
  velocity_class: string;
  seasonality: string;
}

interface InventoryRecord {
  sku_id: string;
  cfa_id: string;
  on_hand: number;
  in_transit: number;
  days_of_cover: number;
  shelf_life_remaining_days: number;
}

interface Warehouse {
  id: string;
  name: string;
}

export default function InventoryLab() {
  const [loading, setLoading] = useState(true);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  
  const [search, setSearch] = useState('');
  const [selectedSku, setSelectedSku] = useState<SKU | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchNetworkData();
        setSkus(data.skus || []);
        setInventory(data.inventory_snapshot || []);
        setWarehouses(data.warehouses || []);
      } catch (err) {
        console.error('Failed to load inventory data', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900 text-slate-300 font-mono">
        LOADING INVENTORY LAB...
      </div>
    );
  }

  // KPIs
  const totalSkus = skus.length;
  
  // Calculate total stock value
  const skuCostMap = new Map(skus.map(s => [s.id, s.unit_cost]));
  const totalStockValue = inventory.reduce((sum, inv) => {
    const cost = skuCostMap.get(inv.sku_id) || 0;
    return sum + (inv.on_hand * cost);
  }, 0);

  const totalDaysCover = inventory.reduce((sum, inv) => sum + (inv.days_of_cover || 0), 0);
  const avgDaysCover = inventory.length ? totalDaysCover / inventory.length : 0;

  const stockoutRiskCount = inventory.filter(inv => (inv.days_of_cover || 0) < 7).length;
  const stockoutRiskPct = inventory.length ? (stockoutRiskCount / inventory.length) : 0;

  // Filter SKUs
  const filteredSkus = skus.filter(s => 
    s.id.toLowerCase().includes(search.toLowerCase()) || 
    s.brand?.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  );

  const whMap = new Map(warehouses.map(w => [w.id, w.name]));
  
  const selectedInventory = selectedSku 
    ? inventory.filter(inv => inv.sku_id === selectedSku.id)
    : [];

  const selTotalOnHand = selectedInventory.reduce((s, i) => s + i.on_hand, 0);
  const selTotalInTransit = selectedInventory.reduce((s, i) => s + i.in_transit, 0);
  const selAvgDoc = selectedInventory.length 
    ? selectedInventory.reduce((s, i) => s + (i.days_of_cover||0), 0) / selectedInventory.length 
    : 0;
  const selMinDoc = selectedInventory.length 
    ? Math.min(...selectedInventory.map(i => i.days_of_cover || 0))
    : 0;

  const renderBadge = (vClass: string) => {
    const cls = vClass?.toUpperCase();
    if (cls === 'A') return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs border border-green-500/30">A</span>;
    if (cls === 'B') return <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs border border-amber-500/30">B</span>;
    if (cls === 'C') return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs border border-red-500/30">C</span>;
    return <span className="px-2 py-0.5 bg-slate-500/20 text-slate-400 rounded text-xs border border-slate-500/30">{vClass || '?'}</span>;
  };

  const getDocColor = (doc: number) => {
    if (doc < 7) return 'text-red-400 font-medium';
    if (doc <= 14) return 'text-amber-400';
    return 'text-green-400';
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 font-mono text-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-slate-800 bg-slate-900/50">
        <Package className="w-5 h-5 mr-2 text-blue-400" />
        <h1 className="text-lg font-semibold text-slate-100 tracking-wider">INVENTORY LAB</h1>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-800/20">
        <div className="p-4 border-r border-slate-800">
          <div className="text-slate-500 text-xs mb-1 uppercase">Total SKUs</div>
          <div className="text-2xl font-light text-slate-100">{formatNumber(totalSkus)}</div>
        </div>
        <div className="p-4 border-r border-slate-800">
          <div className="text-slate-500 text-xs mb-1 uppercase">Total Stock Value</div>
          <div className="text-2xl font-light text-blue-400">{formatCurrency(totalStockValue)}</div>
        </div>
        <div className="p-4 border-r border-slate-800">
          <div className="text-slate-500 text-xs mb-1 uppercase">Avg Days of Cover</div>
          <div className="text-2xl font-light text-slate-100">{safeValue(avgDaysCover, 1)}d</div>
        </div>
        <div className="p-4">
          <div className="text-slate-500 text-xs mb-1 uppercase">Stockout Risk (<span className="lowercase">doc</span> &lt; 7)</div>
          <div className="text-2xl font-light text-red-400 flex items-center">
            {formatPercent(stockoutRiskPct)}
            {stockoutRiskPct > 0.1 && <AlertTriangle className="w-4 h-4 ml-2" />}
          </div>
        </div>
      </div>

      {/* Main Split */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT: SKU Directory */}
        <div className="w-1/3 flex flex-col border-r border-slate-800 bg-slate-900/40">
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search SKUs..." 
                className="w-full bg-slate-950 border border-slate-700 rounded pl-9 pr-3 py-1.5 text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-900 shadow-sm shadow-slate-900 border-b border-slate-800 z-10">
                <tr>
                  <th className="py-2 px-3 text-xs font-medium text-slate-500">ID</th>
                  <th className="py-2 px-3 text-xs font-medium text-slate-500">BRAND</th>
                  <th className="py-2 px-3 text-xs font-medium text-slate-500 text-center">CLS</th>
                  <th className="py-2 px-3 text-xs font-medium text-slate-500 text-right">COST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredSkus.map(sku => (
                  <tr 
                    key={sku.id} 
                    onClick={() => setSelectedSku(sku)}
                    className={`cursor-pointer hover:bg-slate-800/50 transition-colors ${selectedSku?.id === sku.id ? 'bg-blue-900/20 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent'}`}
                  >
                    <td className="py-2 px-3">
                      <div className="text-slate-200">{sku.id}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[100px]" title={sku.category}>{sku.category}</div>
                    </td>
                    <td className="py-2 px-3 text-slate-400">{sku.brand}</td>
                    <td className="py-2 px-3 text-center">{renderBadge(sku.velocity_class)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{formatCurrency(sku.unit_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: Details */}
        <div className="flex-1 flex flex-col bg-slate-900/20 overflow-hidden">
          {selectedSku ? (
            <>
              {/* Top: Info Card */}
              <div className="p-4 border-b border-slate-800">
                <h2 className="text-xl font-medium text-slate-100 mb-4">{selectedSku.id} — {selectedSku.brand}</h2>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Category</div>
                    <div className="text-slate-300">{selectedSku.category || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Pack</div>
                    <div className="text-slate-300">{selectedSku.pack || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Weight</div>
                    <div className="text-slate-300">{safeValue(selectedSku.weight_kg, 2)} kg</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Seasonality</div>
                    <div className="text-slate-300">{selectedSku.seasonality || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Middle: Inventory Table */}
              <div className="flex-1 overflow-auto border-b border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-900 shadow-sm border-b border-slate-800 z-10">
                    <tr>
                      <th className="py-3 px-4 text-xs font-medium text-slate-500">CFA</th>
                      <th className="py-3 px-4 text-xs font-medium text-slate-500 text-right">ON HAND</th>
                      <th className="py-3 px-4 text-xs font-medium text-slate-500 text-right">IN TRANSIT</th>
                      <th className="py-3 px-4 text-xs font-medium text-slate-500 text-right">DOC</th>
                      <th className="py-3 px-4 text-xs font-medium text-slate-500 text-right">REMAINING LIFE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {selectedInventory.length > 0 ? selectedInventory.map((inv, idx) => (
                      <tr key={`${inv.sku_id}-${inv.cfa_id}-${idx}`} className="hover:bg-slate-800/30">
                        <td className="py-2 px-4 text-slate-300">{whMap.get(inv.cfa_id) || inv.cfa_id}</td>
                        <td className="py-2 px-4 text-right text-slate-400">{formatNumber(inv.on_hand)}</td>
                        <td className="py-2 px-4 text-right text-slate-400">{formatNumber(inv.in_transit)}</td>
                        <td className={`py-2 px-4 text-right ${getDocColor(inv.days_of_cover)}`}>
                          {safeValue(inv.days_of_cover, 1)}d
                        </td>
                        <td className="py-2 px-4 text-right text-slate-400">{safeValue(inv.shelf_life_remaining_days, 0)}d</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">No inventory records found for this SKU.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom: Summary Stats */}
              <div className="p-4 bg-slate-900/60 grid grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1 uppercase">Total On Hand</div>
                  <div className="text-lg text-slate-200">{formatNumber(selTotalOnHand)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1 uppercase">Total In Transit</div>
                  <div className="text-lg text-slate-200">{formatNumber(selTotalInTransit)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1 uppercase">Avg DOC</div>
                  <div className="text-lg text-slate-200">{safeValue(selAvgDoc, 1)}d</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1 uppercase">Min DOC</div>
                  <div className={`text-lg flex items-center ${selMinDoc < 7 ? 'text-red-400' : 'text-slate-200'}`}>
                    {safeValue(selMinDoc, 1)}d
                    {selMinDoc < 7 && <AlertTriangle className="w-4 h-4 ml-2" />}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
              <Info className="w-12 h-12 mb-4 opacity-50" />
              <p>Select a SKU from the directory to view inventory details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
