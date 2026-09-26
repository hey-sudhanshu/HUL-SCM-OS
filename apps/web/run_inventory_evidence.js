import fs from 'fs';
import { compute_inventory_policy, classify_abc_xyz } from './src/lib/inventory.ts';
const mockCostParams = { capital_cost_rate: 0.15, storage_cost_per_pallet_day: 15, insurance_rate: 0.0005, shrinkage_rate: 0.02 };
const network = JSON.parse(fs.readFileSync('public/precomputed/network.json', 'utf8'));

const sku44 = network.skus.find(s => s.id === 'SKU-044');
const d18 = network.demand_history['SKU-044']['DEP-18'];
const whyd = network.demand_history['SKU-044']['WH-HYD'];
const calcMean = (arr) => arr.reduce((a,b)=>a+b,0)/arr.length;
const calcStd = (arr, m) => Math.sqrt(arr.reduce((a,b)=>a+Math.pow(b-m,2),0)/arr.length);
const m18 = calcMean(d18), s18 = calcStd(d18, m18);
const mhyd = calcMean(whyd), shyd = calcStd(whyd, mhyd);

const pol18 = compute_inventory_policy(sku44, "AY", m18, s18, 3, 1, mockCostParams, 0.95).outputs;
const polhyd = compute_inventory_policy(sku44, "AY", mhyd, shyd, 3, 1, mockCostParams, 0.95).outputs;

console.log(`SKU-044 at DEP-18: Mean=${m18.toFixed(2)}, Sigma=${s18.toFixed(2)} -> ROP=${pol18.rop.toFixed(0)}, OrderQty=${pol18.eoq.toFixed(0)}`);
console.log(`SKU-044 at WH-HYD: Mean=${mhyd.toFixed(2)}, Sigma=${shyd.toFixed(2)} -> ROP=${polhyd.rop.toFixed(0)}, OrderQty=${polhyd.eoq.toFixed(0)}`);
