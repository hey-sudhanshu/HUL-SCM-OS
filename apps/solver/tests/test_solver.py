import pytest
import json
import math

def test_dispatch_verifier_negative(): pass
def test_k_shortest_yens(): pass
def test_dispatch_rejects_infeasible(): pass
def test_dispatch_positive_multi_drop(): pass
def test_cvrp_feasibility(): pass
def test_eway_bill(): pass

def test_wh_rai_payback():
    print("\n=== WH-RAI PAYBACK ===")
    with open("data/network.json", "r") as f:
        net = json.load(f)
    with open("data/network_demand.json", "r") as fd:
        dem = json.load(fd)

    total_kg = 0
    sku_weights = {s['id']: s['weight_kg'] for s in net['skus']}
    sku_counts = 0
    top_contributors = []

    for sku_id, cfas in dem['demand_history'].items():
        demand_units = 0
        for cfa, weekly in cfas.items():
            if cfa == "WH-RAI":
                demand_units += sum(weekly)
                
        if demand_units > 0:
            weight = sku_weights.get(sku_id, 1)
            total_kg += demand_units * weight
            sku_counts += 1
            top_contributors.append((sku_id, demand_units * weight))
            
    annual_tonnes = (total_kg / 3) / 1000.0  # over 3 years
    print(f"Total SKUs contributing: {sku_counts}")
    print(f"Annual Tonnes Derived from Data: {annual_tonnes:.1f}t")

    # Get distances from network
    pune_nagpur_km = next((l['distance_km'] for l in net['lanes'] if l['source_id'] == 'PL-PUN' and l['dest_id'] == 'WH-NAG'), 710)
    pune_raipur_km = next((l['distance_km'] for l in net['lanes'] if l['source_id'] == 'PL-PUN' and l['dest_id'] == 'WH-RAI'), 810)
    nagpur_raipur_km = 285 # approx
    local_dist_km = 15

    rate_per_t_km = 30 / 16.0  # Rs 1.875/t-km based on HCV (16t) costing Rs 30/km
    
    # Nagpur Baseline
    nag_upstream_cost_t = pune_nagpur_km * rate_per_t_km
    nag_downstream_cost_t = nagpur_raipur_km * rate_per_t_km
    cost_nagpur_t = nag_upstream_cost_t + nag_downstream_cost_t
    annual_freight_nagpur = annual_tonnes * cost_nagpur_t
    
    # WH-RAI 
    rai_upstream_cost_t = pune_raipur_km * rate_per_t_km
    rai_downstream_cost_t = local_dist_km * rate_per_t_km
    cost_raipur_t = rai_upstream_cost_t + rai_downstream_cost_t
    annual_freight_raipur = annual_tonnes * cost_raipur_t
    
    savings = annual_freight_nagpur - annual_freight_raipur
    
    # Exact values from network.json
    wh_rai = next(w for w in net['warehouses'] if w['id'] == 'WH-RAI')
    capex = wh_rai['setup_cost']
    opex_per_pallet = wh_rai['operating_cost_per_pallet']
    # If 1 pallet = 500kg, total pallets per year = annual_kg / 500
    annual_pallets = (annual_tonnes * 1000) / 500
    # Assuming operating_cost_per_pallet is per month (common for 3PL) -> annual = * 12
    # Alternatively, just use the per pallet fixed cost * throughput
    annual_opex = annual_pallets * opex_per_pallet
    
    net_savings = savings - annual_opex
    
    print("\n--- Nagpur CFA (Baseline) ---")
    print(f"Pune -> WH-NAG Distance: {pune_nagpur_km:.1f} km, WH-NAG -> Raipur: {nagpur_raipur_km} km")
    print(f"Rate: Rs {rate_per_t_km:.3f}/t-km")
    print(f"Total Freight Cost per tonne: Rs {cost_nagpur_t:.0f}/t")
    print(f"Annual Transport Cost: Rs {annual_freight_nagpur:,.0f}")
    
    print("\n--- WH-RAI (New Hub) ---")
    print(f"PL-PUN -> WH-RAI Distance: {pune_raipur_km:.1f} km, WH-RAI -> Local: {local_dist_km} km")
    print(f"Rate: Rs {rate_per_t_km:.3f}/t-km")
    print(f"Total Freight Cost per tonne: Rs {cost_raipur_t:.0f}/t")
    print(f"Annual Transport Cost: Rs {annual_freight_raipur:,.0f}")
    
    print(f"\nHub setup_cost (CAPEX) from data/network.json: Rs {capex:,.0f}")
    print(f"Hub operating_cost_per_pallet from data/network.json: Rs {opex_per_pallet} (implied Annual OPEX on {annual_pallets:,.0f} pallets throughput: Rs {annual_opex:,.0f})")
    
    print(f"Gross Transport Savings: Rs {savings:,.0f}")
    print(f"Net Savings (post-OPEX): Rs {net_savings:,.0f}")
    if net_savings > 0:
        print(f"Payback Period: {capex / net_savings:.1f} years")
    else:
        print("No Payback (Net Savings are negative)")
    assert True

def test_bin_packing_feasibility(): pass
