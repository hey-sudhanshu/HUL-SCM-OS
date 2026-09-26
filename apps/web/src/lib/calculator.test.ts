import { describe, it, expect } from 'vitest';
import { calculateFreightCost, rankWarehouses, WarehouseCandidate, CostParams } from './calculator';

describe('calculator logic', () => {
  it('calculates freight cost accurately including detention', () => {
    const costParams: CostParams = {
      diesel_price_per_liter: 90,
      toll_per_km: 2.5,
      detention_cost_per_hour: 500,
      driver_cost_per_day: 1000,
      fixed_vehicle_cost_per_day: 4000,
      handling_cost_per_pallet: 50,
      insurance_rate_pct: 1.5,
      emission_factor_kg_co2_per_km: 1.2
    };

    // 1000km, planned 24h, actual 34h, hub_dwell_share=0.5
    // trip_days = 34 / 24 = 1.4166
    // delay_hours = 10. hub_dwell_hours = 5. detention = 5 * 500 = 2500
    // Fixed = 4000 * 1.4166 = 5666.66
    // Driver = 1000 * 1.4166 = 1416.66
    const result = calculateFreightCost(1000, 24, 34, 0.5, 10, 16000, costParams, 1.0);
    
    expect(result.diesel_cost).toBe(9000);
    expect(result.toll_cost).toBe(2500);
    expect(result.detention_cost).toBe(2500);
    expect(result.fixed_cost).toBeCloseTo(5666.67, 1);
    expect(result.driver_cost).toBeCloseTo(1416.67, 1);
    expect(result.handling_cost).toBe((16000/500)*50); // 32 * 50 = 1600
    expect(result.emissions_kg_co2).toBe(1200);
    expect(result.total_cost).toBeGreaterThan(result.total_cost_without_delay);
  });

  it('ranks alternate warehouses correctly with feasibility filters', () => {
    const candidates: WarehouseCandidate[] = [
      { id: 'WH-POOR', distance_km: 1000, cost_per_pallet: 25, capacity_headroom_pct: 0.05, transit_mean: 40, transit_std: 24, stock_availability: 0.8 }, // Worst
      { id: 'WH-GOOD', distance_km: 200, cost_per_pallet: 12, capacity_headroom_pct: 0.40, transit_mean: 10, transit_std: 2, stock_availability: 0.95 },   // Best
      { id: 'WH-MID', distance_km: 500, cost_per_pallet: 15, capacity_headroom_pct: 0.20, transit_mean: 20, transit_std: 10, stock_availability: 0.9 },    // Middle
      { id: 'WH-FAR', distance_km: 3000, cost_per_pallet: 10, capacity_headroom_pct: 0.50, transit_mean: 120, transit_std: 5, stock_availability: 0.99 } // Too far
    ];

    const weights = {
      w_distance: 0.2,
      w_cost: 0.2,
      w_headroom: 0.1,
      w_transit_time: 0.2,
      w_reliability: 0.1,
      w_availability: 0.2
    };

    // Filter out anything > 2000km or > 100 transit hours (WH-FAR excluded)
    const ranked = rankWarehouses(candidates, weights, 2000, 100);
    
    expect(ranked.length).toBe(3);
    expect(ranked[0].id).toBe('WH-GOOD');
    expect(ranked[1].id).toBe('WH-MID');
    expect(ranked[2].id).toBe('WH-POOR');
  });

  it('asserts that ideal + time variance + detention === actual', () => {
    const params = {
      diesel_price_per_liter: 90,
      toll_per_km: 2.5,
      detention_cost_per_hour: 200,
      driver_cost_per_day: 1200,
      fixed_vehicle_cost_per_day: 3000,
      handling_cost_per_pallet: 50,
      insurance_rate_pct: 1.5,
      emission_factor_kg_co2_per_km: 1.2
    };

    const res = calculateFreightCost(
      1100, // dist
      36,   // planned
      85,   // actual
      1.0,  // hub dwell share
      5.0,  // kpl
      16000, // capacity
      params,
      1.0   // load factor
    );

    const actual_trip_days = 85 / 24;
    const planned_trip_days = 36 / 24;

    const time_variance_fixed = params.fixed_vehicle_cost_per_day * (actual_trip_days - planned_trip_days);
    const time_variance_driver = params.driver_cost_per_day * (actual_trip_days - planned_trip_days);
    
    // handling is fixed
    const pallets = 16000 / 500;
    const handling = pallets * params.handling_cost_per_pallet;

    // insurance is fixed per shipment
    const load_value = 16000 * 150;
    const insurance_actual = load_value * (params.insurance_rate_pct / 100);
    const insurance_ideal = insurance_actual;
    const time_variance_insurance = 0;

    const total_time_variance = time_variance_fixed + time_variance_driver + time_variance_insurance;
    
    expect(res.total_cost).toBeCloseTo(res.total_cost_without_delay + total_time_variance + res.detention_cost, 2);
  });
});
