const fs = require('fs');

const data = JSON.parse(fs.readFileSync('../../data/network.json', 'utf8'));

// Warehouse Manager for Raipur (DIST-RAI)
let candidates = [];
data.lanes.forEach(l => {
  if (l.dest_id === 'DIST-RAI') {
    const wh = data.warehouses.find(w => w.id === l.source_id);
    if (wh) {
      candidates.push({
        id: wh.id,
        distance_km: l.distance_km,
        cost_per_pallet: wh.operating_cost_per_pallet,
        capacity_headroom_pct: 1.0 - wh.utilization_pct,
        transit_std: l.actual_transit_std
      });
    }
  }
});

function rankWarehouses(candidates, weights) {
  if (candidates.length === 0) return [];
  const max_dist = Math.max(...candidates.map(c => c.distance_km), 1);
  const max_cost = Math.max(...candidates.map(c => c.cost_per_pallet), 1);
  const max_std = Math.max(...candidates.map(c => c.transit_std), 1);

  const scored = candidates.map(c => {
    const n_dist = c.distance_km / max_dist;
    const n_cost = c.cost_per_pallet / max_cost;
    const n_headroom_penalty = 1 - c.capacity_headroom_pct;
    const n_rel = c.transit_std / max_std;
    const total_weight = weights.w_distance + weights.w_cost + weights.w_headroom + weights.w_reliability || 1;
    const penalty = ((n_dist * weights.w_distance) + (n_cost * weights.w_cost) + (n_headroom_penalty * weights.w_headroom) + (n_rel * weights.w_reliability)) / total_weight;
    return { ...c, score: 1 - penalty };
  });
  return scored.sort((a, b) => b.score - a.score);
}

const w_default = { w_distance: 0.4, w_cost: 0.3, w_headroom: 0.1, w_reliability: 0.2 };
const ranked_default = rankWarehouses(candidates, w_default);
console.log("DEFAULT WEIGHTS (Top 5 for DIST-RAI):");
ranked_default.slice(0,5).forEach(c => console.log(`${c.id}: ${(c.score * 100).toFixed(1)}`));

const w_changed = { w_distance: 0.1, w_cost: 0.1, w_headroom: 0.6, w_reliability: 0.2 };
const ranked_changed = rankWarehouses(candidates, w_changed);
console.log("\nCHANGED WEIGHTS (Headroom heavily weighted - Top 5 for DIST-RAI):");
ranked_changed.slice(0,5).forEach(c => console.log(`${c.id}: ${(c.score * 100).toFixed(1)}`));

// Freight Calc
function calcFreight(lane, fleet) {
  const diesel_cost = (lane.distance_km / 5) * data.cost_parameters.diesel_price_per_liter;
  const toll_cost = lane.distance_km * data.cost_parameters.toll_per_km;
  const fixed_cost = fleet.fixed_cost_per_trip;
  const detention_hours = Math.max(0, lane.actual_transit_mean - 24);
  const detention_cost = detention_hours * data.cost_parameters.detention_cost_per_hour;
  const total_cost = diesel_cost + toll_cost + fixed_cost + detention_cost;
  
  const cap_tonnes = fleet.capacity_kg / 1000;
  const c_ptk = total_cost / (lane.distance_km * cap_tonnes);
  const c_pc = total_cost / (fleet.capacity_kg / 10);
  
  console.log(`\nFreight: ${lane.source_id} -> ${lane.dest_id} (Fleet: ${fleet.type})`);
  console.log(`Distance: ${lane.distance_km}km, Mean Transit: ${lane.actual_transit_mean}h`);
  console.log(`Diesel: ${diesel_cost.toFixed(2)}, Toll: ${toll_cost.toFixed(2)}, Fixed: ${fixed_cost.toFixed(2)}, Detention: ${detention_cost.toFixed(2)}`);
  console.log(`TOTAL: ${total_cost.toFixed(2)}`);
  console.log(`Cost/Tonne-Km: ${c_ptk.toFixed(2)}`);
  console.log(`Cost/Case: ${c_pc.toFixed(2)}`);
}

const pune_lane = data.lanes.find(l => l.source_id === 'WH-PUN' && l.dest_id === 'DIST-RAI');
const nagpur_lane = data.lanes.find(l => l.source_id === 'WH-NAG' && l.dest_id === 'DIST-RAI');
const hcv = data.fleet.find(f => f.type === 'HCV'); // 16000kg

calcFreight(pune_lane, hcv);
calcFreight(nagpur_lane, hcv);
