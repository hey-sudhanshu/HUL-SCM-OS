import fs from 'fs';
import { compute_inventory_policy } from './src/lib/inventory.ts';

const net = JSON.parse(fs.readFileSync('./public/precomputed/network.json', 'utf8'));
const mockCostParams = { capital_cost_rate: 0.15, storage_cost_per_pallet_day: 15, insurance_rate: 0.0005, shrinkage_rate: 0.02 };

let oldSS = 0; let newSS = 0;
let oldPipe = 0; let newPipe = 0;
let oldCost = 0; let newCost = 0;
let skusCount = 0;

net.skus.forEach(s => {
    let hist = [];
    const hists = net.demand_history[s.id] || {};
    for (let i = 30; i < 40; i++) {
        const cfaHist = hists[`DEP-${i}`] || [];
        if (hist.length === 0) hist = [...cfaHist];
        else {
            for(let j=0; j<hist.length; j++) hist[j] += (cfaHist[j] || 0);
        }
    }
    
    if (hist.length === 0) return;
    skusCount++;
    const mean = hist.reduce((a,b)=>a+b,0)/hist.length;
    const st = Math.sqrt(hist.reduce((a,b)=>a+Math.pow(b-mean,2),0)/hist.length);
    
    // Old: Pune->Raipur: mean ~85h (3.5 days), sigma ~24h (1 day)
    const polOld = compute_inventory_policy(s, "AY", mean, st, 3.5, 1.0, mockCostParams, 0.95).outputs;
    
    // New: WH-RAI hub: mean ~12h (0.5 days), sigma ~2h (0.083 days)
    const polNew = compute_inventory_policy(s, "AY", mean, st, 0.5, 0.083, mockCostParams, 0.95).outputs;
    
    oldSS += polOld.ss; newSS += polNew.ss;
    oldPipe += polOld.pipeline; newPipe += polNew.pipeline;
    
    oldCost += (polOld.ss + polOld.pipeline) * s.unit_cost; 
    newCost += (polNew.ss + polNew.pipeline) * s.unit_cost;
});

console.log("=== WH-RAI SERVICE LEVEL BENEFIT (Mean & Sigma Change) ===");
console.log(`Old (Pune->Raipur | Mean 85h, Sigma 24h) | SS: ${oldSS.toFixed(0)} units | Pipe: ${oldPipe.toFixed(0)} units | Inv Value: ₹${(oldCost/100000).toFixed(2)} Lakhs`);
console.log(`New (WH-RAI Hub   | Mean 12h, Sigma  2h) | SS: ${newSS.toFixed(0)} units | Pipe: ${newPipe.toFixed(0)} units | Inv Value: ₹${(newCost/100000).toFixed(2)} Lakhs`);
const deltaCap = oldCost - newCost;
console.log(`Capital Released: ₹${(deltaCap/100000).toFixed(2)} Lakhs`);
const holdingRate = 0.20; // Approx 20%
console.log(`Holding Cost Savings (at 20%): ₹${(deltaCap * holdingRate / 100000).toFixed(2)} Lakhs/yr`);
