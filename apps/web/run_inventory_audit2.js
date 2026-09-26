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
    const hists = net.demand_history[s.id] || {};
    let nodeCVs = [];
    let totalMean = 0;
    Object.values(hists).forEach(cfaHist => {
        if (!cfaHist || cfaHist.length === 0) return;
        const mean = cfaHist.reduce((a,b)=>a+b,0)/cfaHist.length;
        totalMean += mean;
        const std = Math.sqrt(cfaHist.reduce((a,b)=>a+Math.pow(b-mean,2),0)/cfaHist.length);
        if (mean > 0) nodeCVs.push(std/mean);
    });
    
    nodeCVs.sort((a,b)=>a-b);
    let medianCV = 0;
    if (nodeCVs.length > 0) {
        medianCV = nodeCVs[Math.floor(nodeCVs.length/2)];
    }
    
    const annualVal = totalMean * 52 * s.unit_cost;
    totalVal += annualVal;
    
    s._annualVal = annualVal;
    s._cv = medianCV;
});

net.skus.sort((a,b) => b._annualVal - a._annualVal);
let cumVal = 0;
net.skus.forEach(s => {
    cumVal += s._annualVal;
    const pct = cumVal / totalVal;
    let abc = "C";
    if (pct <= 0.80) abc = "A";
    else if (pct <= 0.95) abc = "B";
    
    let xyz = "Z";
    if (s._cv <= 0.5) xyz = "X";
    else if (s._cv <= 1.0) xyz = "Y";
    
    let cell = abc + xyz;
    grid[cell].count++;
    grid[cell].val += s._annualVal;
    grid[cell].cvs.push(s._cv);
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
    } else {
        console.log(`${cell}: 0 SKUs | Val Share: 0.0%`);
    }
}

console.log("\n=== TOP 10 REORDER PLAN ROWS ===");
let plan = [];
net.inventory_snapshot.forEach(inv => {
    const s = net.skus.find(x => x.id === inv.sku_id);
    const hist = (net.demand_history[s.id] || {})[inv.cfa_id] || [];
    if (hist.length === 0) return;
    
    const mean = hist.reduce((a,b)=>a+b,0)/hist.length;
    const std = Math.sqrt(hist.reduce((a,b)=>a+Math.pow(b-mean,2),0)/hist.length);
    
    // Per Node evaluation!
    const pol = compute_inventory_policy(s, "AY", mean, std, 3, 1, costParams, 0.95).outputs;
    const available = inv.on_hand + inv.in_transit;
    
    if (available <= pol.rop) {
        let order_qty = Math.max(0, pol.s_max - available);
        if (s.velocity_class === 'C' && mean > 0) {
            order_qty = Math.min(order_qty, (mean / 7) * 30);
        }
        
        plan.push({
            sku_id: s.id,
            cfa_id: inv.cfa_id,
            available: available,
            rop: pol.rop,
            order_qty: order_qty,
            days_of_cover: inv.days_of_cover,
            story: inv.story,
            value_at_risk: order_qty * s.unit_cost
        });
    }
});

// Sort by days_of_cover ascending, then value_at_risk descending
plan.sort((a,b) => {
    if (Math.abs(a.days_of_cover - b.days_of_cover) > 0.01) return a.days_of_cover - b.days_of_cover;
    return b.value_at_risk - a.value_at_risk;
});

plan.slice(0, 10).forEach(r => {
    console.log(`${r.sku_id} @ ${r.cfa_id} | Avail: ${r.available.toFixed(1)} | ROP: ${r.rop.toFixed(1)} | OrderQty: ${r.order_qty.toFixed(1)} | Cover: ${r.days_of_cover.toFixed(1)}d | ValueAtRisk: ₹${r.value_at_risk.toFixed(0)} | Story: ${r.story}`);
});

console.log(`Total SKU-Node pairs below ROP: ${plan.length}`);
console.log("\n=== SEEDED STORY EXAMPLES ===");
plan.filter(r => r.story !== "Normal").slice(0, 5).forEach(r => {
    console.log(`${r.sku_id} @ ${r.cfa_id} | Avail: ${r.available.toFixed(1)} | ROP: ${r.rop.toFixed(1)} | OrderQty: ${r.order_qty.toFixed(1)} | Cover: ${r.days_of_cover.toFixed(1)}d | ValueAtRisk: ₹${r.value_at_risk.toFixed(0)} | Story: ${r.story}`);
});
let stories = ["Festive Low Cover", "Near Expiry", "Excess (Class C)"];
stories.forEach(story => {
    let example = plan.find(r => r.story === story);
    if (!example) {
        // Might not be below ROP, let's find it in the raw inventory
        const inv = net.inventory_snapshot.find(i => i.story === story);
        if (inv) {
            console.log(`[RAW] ${inv.sku_id} @ ${inv.cfa_id} | Avail: ${(inv.on_hand + inv.in_transit).toFixed(1)} | Cover: ${inv.days_of_cover.toFixed(1)}d | Story: ${inv.story}`);
        } else {
            console.log(`No example found for ${story}`);
        }
    } else {
        console.log(`[PLAN] ${example.sku_id} @ ${example.cfa_id} | Avail: ${example.available.toFixed(1)} | ROP: ${example.rop.toFixed(1)} | OrderQty: ${example.order_qty.toFixed(1)} | Cover: ${example.days_of_cover.toFixed(1)}d | ValueAtRisk: ₹${example.value_at_risk.toFixed(0)} | Story: ${example.story}`);
    }
});
