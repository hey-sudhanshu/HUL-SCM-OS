import { describe, it, expect } from 'vitest';
import { calculateFreightCost, rankWarehouses } from './calculator';

describe('Evidence for User', () => {
  it('prints evidence', () => {
    const mockCostParams = {
        diesel_price_per_liter: 90,
        toll_per_km: 2.5,
        detention_cost_per_hour: 500, // NOTE: this is a pure penalty on top of fixed/driver cost
        driver_cost_per_day: 1000,
        fixed_vehicle_cost_per_day: 4000,
        handling_cost_per_pallet: 50,
        insurance_rate_pct: 0.05, // 0.05%
        emission_factor_kg_co2_per_km: 1.2
    };

    // Plant->Pune 30km (upstream) + Pune->Raipur 1100km = 1130km
    // Wait, downstream only for detention calculations
    const resPun = calculateFreightCost(1100, 36, 85, 0.4, 5, 16000, mockCostParams, 1.0);
    const actual_trip_days_pun = 85 / 24;
    const planned_trip_days_pun = 36 / 24;
    const time_variance_pun = (actual_trip_days_pun - planned_trip_days_pun) * (mockCostParams.fixed_vehicle_cost_per_day + mockCostParams.driver_cost_per_day);
    
    // Assert reconciliation
    expect(resPun.total_cost).toBeCloseTo(resPun.total_cost_without_delay + time_variance_pun + resPun.detention_cost, 1);
    
    // Plant->Nagpur 715km + Nagpur->Raipur 280km = 995km
    const resNag = calculateFreightCost(280, 10, 12, 0.4, 5, 16000, mockCostParams, 1.0);
    const actual_trip_days_nag = 12 / 24;
    const planned_trip_days_nag = 10 / 24;
    const time_variance_nag = (actual_trip_days_nag - planned_trip_days_nag) * (mockCostParams.fixed_vehicle_cost_per_day + mockCostParams.driver_cost_per_day);
    
    // Assert reconciliation
    expect(resNag.total_cost).toBeCloseTo(resNag.total_cost_without_delay + time_variance_nag + resNag.detention_cost, 1);
    
    const upstream_pun_cost = calculateFreightCost(30, 1, 1, 0, 5, 16000, mockCostParams, 1.0);
    const upstream_nag_cost = calculateFreightCost(715, 20, 20, 0, 5, 16000, mockCostParams, 1.0);

    const total_pun_actual = resPun.total_cost + upstream_pun_cost.total_cost;
    const total_pun_ideal = resPun.total_cost_without_delay + upstream_pun_cost.total_cost_without_delay;
    const total_pun_tkm = 1130 * 16;
    
    const total_nag_actual = resNag.total_cost + upstream_nag_cost.total_cost;
    const total_nag_ideal = resNag.total_cost_without_delay + upstream_nag_cost.total_cost_without_delay;
    const total_nag_tkm = 995 * 16;

    console.log(`\nFreight (Total Landed): Plant -> WH-PUN -> DIST-RAI`);
    console.log(`Upstream: 30km | Downstream: 1100km | Total: 1130km`);
    console.log(`Denominator (t-km): 1130km x 16t = ${total_pun_tkm} t-km`);
    console.log(`Total Landed With Delay: ₹${total_pun_actual.toFixed(2)} | Ideal Cost per t-km = ₹${(total_pun_ideal/total_pun_tkm).toFixed(2)} | Actual Cost per t-km = ₹${(total_pun_actual/total_pun_tkm).toFixed(2)}`);
    console.log(`Breakdown (Downstream Actual): Diesel ₹${resPun.diesel_cost.toFixed(0)}, Toll ₹${resPun.toll_cost.toFixed(0)}, Fixed ₹${(actual_trip_days_pun*mockCostParams.fixed_vehicle_cost_per_day).toFixed(0)}, Driver ₹${(actual_trip_days_pun*mockCostParams.driver_cost_per_day).toFixed(0)}, Detention ₹${resPun.detention_cost.toFixed(0)}, Handling ₹${resPun.handling_cost.toFixed(0)}, Ins ₹${resPun.insurance_cost.toFixed(0)}`);
    console.log(`Cost Reconciliation: Ideal ₹${resPun.total_cost_without_delay.toFixed(0)} + Time Variance ₹${time_variance_pun.toFixed(0)} + Detention ₹${resPun.detention_cost.toFixed(0)} = Actual ₹${resPun.total_cost.toFixed(0)}`);

    console.log(`\nFreight (Total Landed): Plant -> WH-NAG -> DIST-RAI`);
    console.log(`Upstream: 715km | Downstream: 280km | Total: 995km`);
    console.log(`Denominator (t-km): 995km x 16t = ${total_nag_tkm} t-km`);
    console.log(`Total Landed With Delay: ₹${total_nag_actual.toFixed(2)} | Ideal Cost per t-km = ₹${(total_nag_ideal/total_nag_tkm).toFixed(2)} | Actual Cost per t-km = ₹${(total_nag_actual/total_nag_tkm).toFixed(2)}`);
    console.log(`Breakdown (Downstream Actual): Diesel ₹${resNag.diesel_cost.toFixed(0)}, Toll ₹${resNag.toll_cost.toFixed(0)}, Fixed ₹${(actual_trip_days_nag*mockCostParams.fixed_vehicle_cost_per_day).toFixed(0)}, Driver ₹${(actual_trip_days_nag*mockCostParams.driver_cost_per_day).toFixed(0)}, Detention ₹${resNag.detention_cost.toFixed(0)}, Handling ₹${resNag.handling_cost.toFixed(0)}, Ins ₹${resNag.insurance_cost.toFixed(0)}`);
    console.log(`Cost Reconciliation: Ideal ₹${resNag.total_cost_without_delay.toFixed(0)} + Time Variance ₹${time_variance_nag.toFixed(0)} + Detention ₹${resNag.detention_cost.toFixed(0)} = Actual ₹${resNag.total_cost.toFixed(0)}`);
    console.log(`\nDistance Effect vs Delay Effect (Pune vs Nagpur):`);
    console.log(`Distance Effect (Ideal Total Pun vs Ideal Total Nag): ₹${(total_pun_ideal - total_nag_ideal).toFixed(2)}`);
    console.log(`Delay Effect (Delay Penalty Pun vs Delay Penalty Nag): ₹${((total_pun_actual-total_pun_ideal) - (total_nag_actual-total_nag_ideal)).toFixed(2)}`);
    console.log(`Total Savings (Pune Actual - Nagpur Actual): ₹${(total_pun_actual - total_nag_actual).toFixed(2)}`);
  });
});
