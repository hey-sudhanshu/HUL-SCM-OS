export interface CostParams {
  diesel_price_per_liter: number;
  toll_per_km: number;
  detention_cost_per_hour: number;
  driver_cost_per_day: number;
  fixed_vehicle_cost_per_day: number;
  handling_cost_per_pallet: number;
  insurance_rate_pct: number;
  emission_factor_kg_co2_per_km: number;
}

export interface FreightResult {
  diesel_cost: number;
  toll_cost: number;
  fixed_cost: number;
  driver_cost: number;
  handling_cost: number;
  insurance_cost: number;
  detention_cost: number;
  total_cost: number;
  cost_per_km: number;
  cost_per_tonne_km: number;
  cost_per_case: number;
  emissions_kg_co2: number;
  total_cost_without_delay: number;
}

export function calculateFreightCost(
  distance_km: number,
  planned_transit_hours: number,
  actual_transit_hours: number,
  hub_dwell_share: number,
  fleet_km_per_liter: number,
  fleet_capacity_kg: number,
  cost_params: CostParams,
  load_factor: number = 1.0
): FreightResult {
  const diesel_cost = (distance_km / fleet_km_per_liter) * cost_params.diesel_price_per_liter;
  const toll_cost = distance_km * cost_params.toll_per_km;
  
  // Trip days based on actual transit
  const actual_trip_days = actual_transit_hours / 24.0;
  const planned_trip_days = planned_transit_hours / 24.0;
  
  const fixed_cost = cost_params.fixed_vehicle_cost_per_day * actual_trip_days;
  const driver_cost = cost_params.driver_cost_per_day * actual_trip_days;

  const fixed_cost_no_delay = cost_params.fixed_vehicle_cost_per_day * planned_trip_days;
  const driver_cost_no_delay = cost_params.driver_cost_per_day * planned_trip_days;
  
  // Handling (assume 500kg per pallet for this estimate)
  const pallets = (fleet_capacity_kg * load_factor) / 500;
  const handling_cost = pallets * cost_params.handling_cost_per_pallet;

  // Insurance is based on load value per shipment (e.g. 0.05% per shipment value).
  const load_value = (fleet_capacity_kg * load_factor) * 150; // Rs 150 per kg assumption
  // cost_params.insurance_rate_pct is now treated as a flat per-shipment rate
  const insurance_cost = load_value * (cost_params.insurance_rate_pct / 100);
  const insurance_cost_no_delay = insurance_cost;

  // Detention based on hub_dwell portion of delay
  const delay_hours = Math.max(0, actual_transit_hours - planned_transit_hours);
  const detention_hours = delay_hours * hub_dwell_share;
  const detention_cost = detention_hours * cost_params.detention_cost_per_hour;

  const total_cost = diesel_cost + toll_cost + fixed_cost + driver_cost + handling_cost + insurance_cost + detention_cost;
  const total_cost_without_delay = diesel_cost + toll_cost + fixed_cost_no_delay + driver_cost_no_delay + handling_cost + insurance_cost_no_delay;
  
  const effective_capacity_tonnes = (fleet_capacity_kg * load_factor) / 1000;
  const cost_per_km = distance_km > 0 ? total_cost / distance_km : 0;
  const cost_per_tonne_km = (distance_km > 0 && effective_capacity_tonnes > 0) ? total_cost / (distance_km * effective_capacity_tonnes) : 0;
  
  // Assume average case weight = 10kg
  const cases_per_truck = (fleet_capacity_kg * load_factor) / 10;
  const cost_per_case = cases_per_truck > 0 ? total_cost / cases_per_truck : 0;

  const emissions_kg_co2 = distance_km * cost_params.emission_factor_kg_co2_per_km;

  return {
    diesel_cost,
    toll_cost,
    fixed_cost,
    driver_cost,
    handling_cost,
    insurance_cost,
    detention_cost,
    total_cost,
    cost_per_km,
    cost_per_tonne_km,
    cost_per_case,
    emissions_kg_co2,
    total_cost_without_delay
  };
}

export interface WarehouseCandidate {
  id: string;
  distance_km: number;
  cost_per_pallet: number;
  capacity_headroom_pct: number;
  transit_mean: number;
  transit_std: number; // reliability
  stock_availability: number; // e.g. 0.95
}

export interface Weights {
  w_distance: number;
  w_cost: number;
  w_headroom: number;
  w_transit_time: number;
  w_reliability: number;
  w_availability: number;
}

export function rankWarehouses(
  candidates: WarehouseCandidate[],
  weights: Weights,
  max_distance: number = 2000,
  max_transit_hours: number = 100
): (WarehouseCandidate & { score: number })[] {
  // Filter for feasibility
  const feasible = candidates.filter(c => 
    c.distance_km <= max_distance && c.transit_mean <= max_transit_hours
  );

  if (feasible.length === 0) return [];

  // Find max values for normalization
  const max_dist = Math.max(...feasible.map(c => c.distance_km), 1);
  const max_cost = Math.max(...feasible.map(c => c.cost_per_pallet), 1);
  const max_transit = Math.max(...feasible.map(c => c.transit_mean), 1);
  const max_std = Math.max(...feasible.map(c => c.transit_std), 1);

  // Normalize weights
  const total_weight = weights.w_distance + weights.w_cost + weights.w_headroom + 
                       weights.w_transit_time + weights.w_reliability + weights.w_availability || 1;

  const scored = feasible.map(c => {
    const n_dist = c.distance_km / max_dist;
    const n_cost = c.cost_per_pallet / max_cost;
    const n_headroom_penalty = 1 - c.capacity_headroom_pct; // higher headroom is better
    const n_transit = c.transit_mean / max_transit;
    const n_rel = c.transit_std / max_std;
    const n_avail_penalty = 1 - c.stock_availability; // higher availability is better
    
    const penalty = (
      (n_dist * weights.w_distance) +
      (n_cost * weights.w_cost) +
      (n_headroom_penalty * weights.w_headroom) +
      (n_transit * weights.w_transit_time) +
      (n_rel * weights.w_reliability) +
      (n_avail_penalty * weights.w_availability)
    ) / total_weight;

    return {
      ...c,
      score: 1 - penalty
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}
