import fs from 'fs';
import { compute_inventory_policy } from './src/lib/inventory.ts';

const mockCostParams = { capital_cost_rate: 0.15, storage_cost_per_pallet_day: 15, insurance_rate: 0.0005, shrinkage_rate: 0.02 };
const network = JSON.parse(fs.readFileSync('public/precomputed/network.json', 'utf8'));

let oldSS = 0; let newSS = 0;
let oldCost = 0; let newCost = 0;

network.skus.forEach(s => {
    // get demand for Central (Chhattisgarh) region
    const hist = network.demand_history[s.id]?.['Central (Chhattisgarh)'];
    if (!hist) return;
    const calcMean = (arr) => arr.reduce((a,b)=>a+b,0)/arr.length;
    const calcStd = (arr, m) => Math.sqrt(arr.reduce((a,b)=>a+Math.pow(b-m,2),0)/arr.length);
    const m = calcMean(hist), st = calcStd(hist, m);
    
    // Old: Nagpur to Raipur -> 285km -> ~10-14h + delays -> StdL = 24h (0.142 weeks)
    const polOld = compute_inventory_policy(s, "AY", m, st, 1, 0.142, mockCostParams, 0.95).outputs;
    
    // New: WH-RAI direct -> StdL = 2h (0.012 weeks)
    const polNew = compute_inventory_policy(s, "AY", m, st, 1, 0.012, mockCostParams, 0.95).outputs;
    
    oldSS += polOld.ss; newSS += polNew.ss;
    oldCost += polOld.ss * s.unit_cost; newCost += polNew.ss * s.unit_cost;
});

const holdingRate = 0.15 + (15*365/1.5/1000) + 0.0005 + 0.02; // Approx

console.log("=== SERVICE LEVEL (SAFETY STOCK) BENEFIT ===");
console.log(`Old Safety Stock (24h Lead Sigma): ₹${(oldCost/100000).toFixed(2)} Lakhs`);
console.log(`New Safety Stock (2h Lead Sigma): ₹${(newCost/100000).toFixed(2)} Lakhs`);
const deltaVal = oldCost - newCost;
console.log(`Capital Released: ₹${(deltaVal/100000).toFixed(2)} Lakhs`);
// holding cost savings
console.log(`Holding Cost Savings: ₹${(deltaVal * 0.20 / 100000).toFixed(2)} Lakhs/yr`);

