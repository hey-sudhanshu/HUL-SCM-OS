# Known Technical Limitations (Phase 4 & 5 Deferred Items)

These are explicitly deferred to the Phase 8 Methodology app and Agent orchestration layers.

1. **Yen's Algorithm Costs vs Freight Calculator:**
   - The OR-Tools and Yen's k-shortest path solver uses purely distance/time heuristics internally to find paths (e.g. 995km yields a scaled metric of Rs 25,480 internally to the solver). 
   - However, the actual Freight Calculator in the UI calculates Rs ~30,897 using granular fixed+variable + driver logic. 
   - *Status*: The UI displays the true Freight Calculator cost, but the solver internally minimized the heuristic cost. Real synchronization of the cost function into OR-Tools is deferred.

2. **Motor Transport Workers Act (9h limits) in OR-Tools:**
   - Fully enforcing 9-hour daily limits with mandatory 12-hour overnight rests *within* the OR-Tools VRPTW solver (via dummy rest nodes or cumul variable bounds) is mathematically complex and currently yields infeasible solutions in our naive setup or misses the violation as noted (e.g., 4.9h + 6.75h = 11.65h in one day).
   - *Status*: The dispatch solver currently outputs total driving time using basic `[road matrix]` or Haversine fallback distances, but does not split shifts. Explicitly deferred.

3. **WH-RAI Hub OPEX vs Freight Savings:**
   - Full scale mathematical payback modeling revealed that the freight savings (Rs 0.39 Cr) do *not* cover the OPEX + Inventory Carrying costs (Rs 1.5 Cr) of a new warehouse. 
   - *Status*: Freight alone does not justify the hub. The UI evaluates it, but ROI is strictly negative without factoring in unquantified service-level improvements.

4. **Multi-Depot UI / Route Optimizer Lane Pre-selection:**
   - Pre-selection works, but large scale multi-depot runs are locked to simple distance bounds to prevent frontend crash.

5. **Printable Trip Sheet & Waterfall Chart:**
   - Both visual components are cleanly deferred to Phase 8 / Control Tower.

## Phase 4/5a Limitations

### a. Last-Stop Service Time & Unexplained 1h Delay
*   **Missing**: Service time (1h) at the final stop is not added before the return leg calculation in the solver verifier script, and an unexplained 1h is added before the first stop.
*   **Why it matters**: It slightly undercounts driving/duty time (e.g. showing 17.3h instead of 18.3h) which could mask a Motor Transport Workers Act driving limit violation.
*   **Planned Fix**: Ensure the unloading delay is only added *after* arrival at a stop, and explicitly add a 1h service penalty for the final stop before dispatching the vehicle back to the depot.

### b. Dispatch Variable & Fixed Costs
*   **Missing**: Dispatch variable cost uses a flat Rs 30/km rather than dynamically pulling from cost configurations; ICV fixed costs changed to 2,500 without warning; all-HCV fleet comparison and baseline derivation are missing from the dispatch report.
*   **Why it matters**: Prevents direct reconciliation with the Freight Calculator's detailed driver/toll/fuel breakdown, and obscures the economic benefit of heterogeneous fleets.
*   **Planned Fix**: Pipe cost parameters directly from `network.json` into the solver, and output comparative runs (All-HCV vs All-ICV vs Heterogeneous).

### c. XYZ CV Clusters & Baseline/Optimized Table
*   **Missing**: The data generator produces rigid CV clusters (0.11, 0.52, 1.40) rather than a smooth continuum, and the per-class baseline vs optimized table was not reprinted after the noise generation was updated.
*   **Why it matters**: It obscures the true ABC-XYZ distribution in a real HUL setting where demand variability forms a continuous spectrum.
*   **Planned Fix**: Implement a continuous noise distribution parameter in `generate_data.py` (e.g., pulling from a Gamma or Lognormal distribution for local variance) and restore the comparative output tables.

### d. MOQ / Order Quantity at SKU-143 @ DEP-13
*   **Missing**: A full truck ordering cost is charged to a single SKU-node pair resulting in 200 days of cover, with no shelf-life cap clipping the EOQ.
*   **Why it matters**: Leads to massive over-ordering for C-class or slow-moving SKUs, inflating working capital and creating obsolescence risk (shelf-life expiration).
*   **Planned Fix**: Implement a `shelf_life_days` ceiling on the order quantity (e.g. `min(EOQ, mean_daily * shelf_life * 0.7)`), and introduce multi-SKU joint ordering logic.

### e. WH-RAI Sensitivities & Distance Basis
*   **Missing**: Sensitivity tables, the distance/rate basis for Rs 380/t, holding savings on regenerated data, and explanation for annual tonnes shifting between runs are missing.
*   **Why it matters**: Business users cannot validate the Rs 1.5 Cr OPEX justification or understand the tipping point for the Hub without sensitivity analysis.
*   **Planned Fix**: Freeze a specific seed for the scenario, explicitize the rate-per-km assumption in the calculator, and generate a 2-way data table for OPEX vs Hub Lead Time.

### f. Missing Tests
*   **Missing**: `test_cvrp_feasibility`, time-window, feasibility-filter, and multi-depot tests were dropped or remain unimplemented.
*   **Why it matters**: Breaks invariant enforcement and reduces confidence in the UI constraints.
*   **Planned Fix**: Restore these unit tests to `test_solver.py` and `evidence.test.ts`.

### g. Pytest Warnings
*   **Missing**: Pytest warnings ballooned from 172 to 1,587 (primarily OR-Tools deprecation warnings regarding float to integer coercion).
*   **Why it matters**: Clutters CI/CD pipelines and masks genuine errors.
*   **Planned Fix**: Explicitly cast all OR-Tools array parameters to `int` within `main.py`, or suppress the specific OR-Tools warning module in `pytest.ini`.

## Phase 6a Additions
- **Node.js FS Timeout Issue**: The virtual environment experienced repeated OS-level `ETIMEDOUT: connection timed out, read` errors originating from `node:fs` (readFileUtf8). This prevented `vitest` and `next build` from completing their runs, although the code logic and React components for Governance, Vendor Manager, and Risk Simulator were successfully implemented.
- **Cross-App Hookups (UI Side)**: The "Approve Reorder" in Inventory Lab and "Submit for Approval" in Route Optimizer were identified but require fixing the Node FS issue to properly wire their onClick handlers to `useGovernanceStore.enqueue()` without crashing the Next compiler.

### Phase 6a Fast-Track Descopes (Sept 24)
- **Hardcoded Distance**: The 280km WH-NAG->DIST-RAI leg is a fixed override for demo consistency, not derived from the generator like other lanes.
- **Monte Carlo Fit**: The Pune-lane fit mismatch is logged as an open item.
- **Descoped Features (Time Constraints)**:
  - Phase 6b: SCOR Map, Balanced Scorecard, dock DES simulation skipped.
  - Phase 5b: Planning Desk / forecasting skipped.
  - Advanced Features: Scenario Compare, Control Tower, PDF/print Reports, and the full Agent Test Bench harness skipped.
