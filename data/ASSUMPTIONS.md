# Data Assumptions & Sources

This document details the generation assumptions and sources for the `data/network.json` seed data.

## Plants & Warehouses
* **Plant Locations (8 locations incl. Haldia, Pune, Mumbai, etc.)**: *Public (verify)* - HUL operates major manufacturing facilities across India.
* **Plant Capacities (40,000 - 100,000 pallets)**: *Synthetic* - Generated for realistic volume modeling.
* **CFA/Depot Coordinates (14 CFAs, 40 Depots)**: *Synthetic* - Distributed across major logistics hubs and tier-2 cities.
* **CFA/Depot Operating Costs (₹10 - ₹25 / pallet)**: *Synthetic* - Approximated based on typical FMCG storage and handling costs.
* **Pune CFA Capacity Utilization (96%)**: *Synthetic* - Forced bottleneck for the Demo Story.

## Distributors & SKUs
* **Distributor Locations (150 clusters)**: *Synthetic* - Represent regional distribution coverage across India, including a specifically placed Raipur (Chhattisgarh) cluster.
* **SKUs (150 total)**: *Synthetic* - Categorized into Home Care, Beauty, Foods, Refreshments. Weight, volume, unit cost, shelf life, and velocity class are procedurally generated for realistic distribution.
* **SKU Brands (Surf Excel, Dove, Red Label, etc.)**: *Public (verify)* - Known HUL powerhouse brands.
* **Demand Profiles (36 months, 156 weeks)**: *Synthetic* - Base demand * trend * noise. Includes festive surges (October/Diwali) and monsoon dips for Eastern corridors.
* **Demand Sparsity**: *Synthetic* - Only ~20% of distributors carry any specific SKU to model realistic assortments.

## Network Lanes & Transit
* **Road Matrix & Coordinates**: *Synthetic* - Direct Haversine distance scaled by a 1.3 factor. Explicitly labeled `osrm_used: false` to represent public OSRM fallback due to matrix size (45,000+ pairs).
* **Pune -> Raipur Transit Time (85h mean)**: *Synthetic* - Used to demonstrate the specific "Distant CFA" scenario from the Demo Story. Delay causes are artificially skewed toward hub dwell and ghat/road.
* **Nagpur -> Raipur Transit Time (12h mean)**: *Synthetic* - Used as the optimal alternate benchmark.

## Suppliers, Fleet, and Cost Parameters
* **Materials (40 groups)**: *Synthetic* - Randomized annual spend, lead times (5-45 days), switching costs, and supply risk scores.
* **Packaging Film Supplier (Single Source)**: *Synthetic* - Created specifically to model supply chain risk in the demo story, assigned a high supply risk score (0.9).
* **Fleet (LCV, ICV, HCV, Multi-axle)**: *Public (verify)* - Standard Indian freight vehicle classes.
* **Cost Parameters**:
  * **Diesel Price (₹89.5/L)**: *Public (verify)* - Baseline configured standard rate.
  * **Toll (₹2.5/km)**: *Synthetic* - Configured benchmark.
  * **Capital Cost (12%)**: *Synthetic* - Configured benchmark.
  * **Storage (₹15/pallet/day)**: *Synthetic* - Configured benchmark.
  * **Insurance (1.5%)**: *Synthetic* - Configured benchmark.
  * **Shrinkage (2.0%)**: *Synthetic* - Configured benchmark.
  * **Detention (₹500/hr)**: *Synthetic* - Configured benchmark.
  * **Emissions (1.2 kg CO2/km)**: *Synthetic* - Configured benchmark.
