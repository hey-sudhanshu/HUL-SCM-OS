import fs from 'fs';
import { compute_inventory_policy } from './src/lib/inventory.ts';

const net = JSON.parse(fs.readFileSync('./public/precomputed/network.json', 'utf8'));
const costParams = { capital_cost_rate: 0.15, storage_cost_per_pallet_day: 15, insurance_rate: 0.0005, shrinkage_rate: 0.02 };

// 9-cell grid prep
let grid = {
    AX: {count:0, val:0, cvs:[]}, AY: {count:0, val:0, cvs:[]}, AZ: {count:0, val:0, cvs:[]},
    BX: {count:0, val:0, cvs:[]}, BY: {count:0, val:0, cvs:[]}, BZ: {count:0, val:0, cvs:[]},
    CX: {count:0, val:0, cvs:[]}, CY: {count:0, val:0, cvs:[]}, CZ: {count:0, val:0, cvs:[]},
};
let totalVal = 0;

net.skus.forEach(s => {
    // get overall history to classify
    const hists = net.demand_history[s.id] || {};
    let totalHist = new Array(156).fill(0);
    Object.values(hists).forEach(cfaHist => {
        for(let i=0; i<156; i++) totalHist[i] += (cfaHist[i] || 0);
    });
    
    const mean = totalHist.reduce((a,b)=>a+b,0)/156;
    const std = Math.sqrt(totalHist.reduce((a,b)=>a+Math.pow(b-mean,2),0)/156);
    const cv = mean > 0 ? std/mean : 0;
    const annualVal = mean * 52 * s.unit_cost;
    
    let abc = annualVal > 25000000 ? "A" : (annualVal > 5000000 ? "B" : "C");
    let xyz = cv <= 0.5 ? "X" : (cv <= 1.0 ? "Y" : "Z");
    let cell = abc + xyz;
    
    grid[cell].count++;
    grid[cell].val += annualVal;
    grid[cell].cvs.push(cv);
    totalVal += annualVal;
});

console.log("=== 9-CELL GRID ===");
for (const cell in grid) {
    const c = grid[cell];
    if (c.count > 0) {
        c.cvs.sort((a,b)=>a-b);
        const min = c.cvs[0].toFixed(2);
        const max = c.cvs[c.cvs.length-1].toFixed(2);
        const med = c.cvs[Math.floor(c.cvs.length/2)].toFixed(2);
        console.log(`${cell}: ${c.count} SKUs | Val Share: ${((c.val/totalVal)*100).toFixed(1)}% | CV (min: ${min}, med: ${med}, max: ${max})`);
    }
}

console.log("\n=== SKU-044 DEEP DIVE ===");
let s44 = net.skus.find(s=>s.id === "SKU-044");
const getPol = (cfa) => {
    const hist = net.demand_history["SKU-044"][cfa];
    const mean = hist.reduce((a,b)=>a+b,0)/hist.length;
    const std = Math.sqrt(hist.reduce((a,b)=>a+Math.pow(b-mean,2),0)/hist.length);
    // Weekly demand. ROP uses L_weeks = 1.
    return {mean, std, pol: compute_inventory_policy(s44, "AY", mean, std, 1, 0.1, costParams, 0.95).outputs};
};
const p18 = getPol("DEP-18");
console.log(`DEP-18 | Mean: ${p18.mean.toFixed(2)}/wk | ROP: ${p18.pol.rop} | Safety Stock: ${p18.pol.ss}`);
const pHYD = getPol("WH-HYD");
console.log(`WH-HYD | Mean: ${pHYD.mean.toFixed(2)}/wk | ROP: ${pHYD.pol.rop} | Safety Stock: ${pHYD.pol.ss}`);

console.log("\n=== EXPLANATIONS ===");
console.log("Q: State units of mean and ROP for SKU-044 and why ROP < mean.");
console.log(`A: Mean is in units/week (${p18.mean.toFixed(2)}). ROP is ${p18.pol.rop}. Wait, if ROP = (Mean * L_weeks) + SS, and L_weeks is 1, then ROP should be Mean + SS. Why was it less?`);
console.log("Let's compute it natively: Mean=" + p18.mean + " SS=" + p18.pol.ss + " ROP=" + (p18.mean*1 + p18.pol.ss));

