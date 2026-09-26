# HUL SCM OS — Master Prompt for Antigravity AI

**How to use this file**
1. Create a new empty workspace in Antigravity. Save **Part B** of this file as `PROJECT_SPEC.md` in the repo root.
2. Paste **Part A** (the short kickoff) into the Agent Manager in **Planning mode**.
3. Review the Implementation Plan and Task List artifacts before approving. Build in the phases from Section 17, one phase at a time, and ask for browser screenshots after each phase.

---

# PART A — KICKOFF PROMPT (paste this into Antigravity)

You are the lead engineer and designer on a university project. Read `PROJECT_SPEC.md` in full before doing anything. It is the single source of truth.

We are building **"HUL SCM OS"**: a desktop-style web application (a retro classic-Mac-OS-inspired desktop with draggable windows) for **Hindustan Unilever Limited's** supply chain. Every supply chain vertical is an app on the desktop, each app has its own **AI agent that executes real work** (optimization, calculation, simulation, planning), and a system-wide **Copilot** orchestrates them. It is not a chatbot.

Rules for this session:
1. Start in **Planning mode**. Produce (a) an Implementation Plan artifact, (b) a Task List artifact broken into the phases in Section 17 of the spec. Wait for my approval before writing code.
2. All numbers shown in the UI must come from deterministic solver or calculation code, never from an LLM. LLMs plan, call tools, and explain.
3. Follow the design system in Section 4 exactly. The result must not look like a generic AI-generated dashboard.
4. After each phase, run the app in the browser, take screenshots, check each acceptance criterion in the spec, and report pass/fail with evidence in a Walkthrough artifact.
5. Ask me only when blocked. Otherwise make a sensible decision, record it in `DECISIONS.md`, and continue.

Begin by reading `PROJECT_SPEC.md`, then produce the Implementation Plan.

---

# PART B — PROJECT_SPEC.md

## 1. Mission and context

**Course context:** Supply Chain Management project (30 marks: Content 15, Delivery 5, Visuals 5, Q&A 5). The syllabus explicitly covers **SCOR, Balanced Scorecard, Kraljic Matrix, Risk Heat-Map Analysis, RACI Matrix, Inventory Control Frameworks, and AI in Supply Chain Analytics**. Team topic: **"Agentic AI in Supply Chain verticals (Inventory, Planning, and Optimization)"**. Team: Group 1.

**Objective:** Build a working, demo-ready system that shows (1) each of those frameworks implemented as a live app running on data, (2) agents that take multi-step actions using real algorithms, and (3) measurable improvement (baseline vs optimized) for a realistic HUL scenario.

**Reference for interaction feel only:** https://fmcg-supply-chain-dashboard.vercel.app/ (a previous project by the same team: a System 7.5-style desktop with draggable app windows). Study its window behaviour, menu bar and icon layout. **Do not copy its identity, colours, or assets.** This project needs its own distinct visual identity (Section 4).

**Company:** Hindustan Unilever Limited (HUL), an Indian FMCG company. Scope: Home Care, Beauty & Wellbeing, Personal Care, and Foods & Refreshment. HUL brand names (e.g., Surf Excel, Rin, Vim, Lifebuoy, Lux, Dove, Pond's, Clinic Plus, Sunsilk, Brooke Bond Red Label, Taj Mahal, Bru, Horlicks, Kissan, Knorr) may appear for illustration.

## 2. Non-negotiable principles

1. **Agents that get things done.** Each agent must plan, call tools, verify results, and present an actionable outcome (a "Plan Card") the user can approve. No agent may simply answer from its own text knowledge.
2. **LLM never does arithmetic or optimization.** All computation is in deterministic code (solvers, formulas, simulation). The LLM selects tools, fills parameters, reads results, and writes explanations that quote tool outputs. Every numeric claim in agent text must reference a `tool_run_id`.
3. **Transparent data provenance.** Real public facts (network scale, categories) are labeled "Public (verify)". Everything else is **calibrated synthetic data**, labeled as such in the UI (a permanent "SYNTHETIC DATA" tag in the About dialog and in the Methodology app).
4. **Human-in-the-loop governance.** The RACI matrix is enforced in code: the agent may Recommend and Simulate, but any "Commit" (approve a reroute, switch warehouse, place a reorder) needs a human role's approval in a dialog.
5. **Demo resilience.** The app must work with no network, no LLM key, and no live solver, using precomputed results and a deterministic scripted planner (Section 9.6). A "Live Solver / Cached" and "Live LLM / Scripted" indicator must show in the menu bar.
6. **Reproducibility.** All random processes use seeded RNG. Same inputs produce the same outputs, except where the user changes the seed.
7. **Desktop-only.** Optimize for 1440×900 and 1920×1080. Below 1280px wide, show a polite full-screen message.

## 3. Tech stack

**Frontend:** Next.js (App Router) + TypeScript (strict), Zustand for shared state, MapLibre GL JS for the geographic map, D3 for tactical map and all charts (custom SVG with hatch patterns; do **not** use default chart-library themes), CSS variables for the design system (Tailwind allowed only for layout utilities).

**Solver service (recommended):** Python FastAPI microservice with:
- Google **OR-Tools** (routing, CP-SAT, LP/MIP)
- **NumPy/SciPy**, **statsmodels** (ETS, SARIMAX), **LightGBM**, **scikit-learn**
- **SimPy** (discrete-event simulation)
- **NetworkX** (graphs, k-shortest paths)

Provide a `docker-compose.yml` and simple run scripts so it works locally for the viva. The frontend must fall back to `/public/precomputed/*.json` generated by `scripts/precompute.py` when the service is unreachable.

**LLM layer:** Provider-agnostic abstraction (`/lib/llm`). Default provider Gemini (function calling), alternative Claude/OpenAI via env vars. Tool schemas defined once in JSON Schema and reused for all providers. **Scripted mode** requires no key (Section 9.6).

**Map data:**
- India state boundaries and city coordinates as bundled GeoJSON (no runtime dependency).
- Road distances and travel times between all node pairs precomputed once via OSRM/OpenRouteService and cached in `/data/road_matrix.json` (fallback: Haversine × 1.3 circuity factor).
- Route geometry: fetch from OSRM at runtime with caching; fallback to a smoothed polyline.
- Basemap tiles: configurable via env var (Carto/OSM/MapTiler). Render in a **monochrome, low-contrast style** to fit the design system. Respect tile provider usage policies and show attribution.

**Deployment:** Frontend on Vercel. Solver service on Render/Railway or local Docker. Include a README with exact steps.

## 4. Design system ("Paper OS")

**Concept:** A classic monochrome-era desktop OS (window chrome with striped title bars, menu bar, desktop icons, dialog boxes, Get Info panels, Trash, control panels) rendered in a **warm, paper-and-ink palette** with muted semantic accents. It must feel crafted, calm and sophisticated, like a well-made piece of software from a parallel history, not a neon "AI dashboard."

**Palette tokens** (define as CSS variables; provide light "Paper" theme and an alternative "Ink" night theme in Control Panel → Appearance):
- `--paper: #ECE5D2` (window body), `--paper-2: #E2DAC3` (recessed), `--desk: #C9C1AA` (desktop background, with subtle 1-bit dither texture)
- `--ink: #1E1B16` (text, borders), `--ink-soft: #5B554A`
- `--sage: #6F8F7E` (positive/ok), `--ochre: #C29A2E` (warning), `--brick: #A24A3B` (critical), `--slate: #5E7286` (info/neutral highlight), `--plum: #7A5C7E` (secondary series)
- No pure white or pure black backgrounds. No gradients. No glow, blur, glassmorphism, or neon.

**Typography:** Window titles and menus in a pixel-style face (e.g., Silkscreen or similar, used sparingly); body and data in **IBM Plex Mono**/Plex Sans; provide fallbacks. Tabular numerals for all figures.

**Chrome rules:**
- 1px ink borders, 0–2px radius, **hard offset drop shadows** (no blur).
- Selection and hover states use a **dither/checker pattern** or ink inversion.
- Title bars with horizontal stripe pattern, close box left, zoom box right.
- Cursor changes to a "watch"/busy cursor during solver calls; a progress dialog (classic barber-pole style) for runs over 500 ms.
- Sound is optional and default off; provide a Control Panel toggle.

**Charts:** Custom D3/SVG. Use **hatch and dot patterns** (diagonal, cross-hatch, dots, dense/sparse) in combination with the muted palette so charts remain legible in greyscale. Pie/donut, stacked bars, histograms + CDF, lines with confidence bands, tornado, waterfall, heat-grid, Gantt. Every chart has a title, unit, source tag and hover readout in a status bar (not a floating glossy tooltip).

**Windowing:** Draggable, resizable, focus/z-order, minimize to a window shelf, zoom, cascade/tile commands (Window menu), snap to edges, remember positions in memory, keyboard shortcuts (⌘/Ctrl+W close, ⌘/Ctrl+K Copilot, ⌘/Ctrl+1..9 focus app), app-specific menus in the menu bar that change with the focused window.

**Desktop:** Wallpaper with a subtle dither pattern and a discreet HUL SCM OS mark (create an original text/pictogram mark; do not use official HUL logos). Icons in a grid with labels. Folders: **HUL Network**, **Frameworks**, **Agents & Tools**, **Reports**. Trash (functional: deleted scenarios can be restored). Clock, status area (LLM mode, solver mode, scenario name). "About This System" dialog lists the team and the synthetic-data disclosure.

**Anti-patterns (reject any of these):** rainbow gradients, glow effects, glass cards, oversized rounded pills, emoji as UI icons (use a custom pixel/line icon set), default Recharts/Chart.js look, generic sidebar-plus-cards admin layouts, stock hero sections, and default MapLibre controls (restyle all controls).

## 5. Data model and synthetic data

Generate with `scripts/generate_data.py` (seeded). Store as JSON under `/data`. Validate with a schema (Zod or JSON Schema). Document every assumption in `/data/ASSUMPTIONS.md`, surfaced in the Methodology app.

**Entities**
- **Suppliers & materials:** ~40 material groups (palm oil derivatives/surfactants, soda ash, LAB/LABSA, fragrances, packaging film, HDPE bottles, cartons, tea leaf, coffee, sugar, minerals, transport hiring, etc.), each with annual spend, supplier count, supply-risk indicators, switching cost, lead time, single-source flag, region.
- **Factories:** ~8–10 illustrative plants across India (e.g., Haldia, Silvassa/Dapada, Pune area, Khamgaon, Sumerpur, Puducherry, Mandideep, Doom Dooma, Baddi) with capacity by category, utilization, changeover times. Mark locations as illustrative.
- **Warehouses:** ~14 mother warehouses / CFAs (Carrying & Forwarding Agents) plus ~40 depot/distributor-hub nodes across states, each with coordinates, capacity (pallets, sq. ft.), utilization, dock count, operating cost, throughput, service region.
- **Distributor nodes:** ~150 distributor/redistribution-stockist nodes aggregated by city/cluster, with weekly demand, drop size, unloading time, delivery time windows.
- **SKUs:** ~150 SKUs with category, brand, pack size, weight, volume, case pack, unit cost, MRP, margin, shelf life, velocity class, demand distribution parameters, seasonality index, festival sensitivity.
- **Demand history:** 36 months of weekly demand per SKU × region cluster, generated with trend, seasonality, festival effects (Diwali, Holi, Eid, Ganesh Chaturthi, wedding season), monsoon effects, promotions, noise, and intermittent behaviour for slow SKUs.
- **Lanes:** All plant→CFA and CFA→distributor lanes with distance, planned vs actual transit-time distribution, cost, and delay-cause decomposition (transit, hub dwell, ghat/road condition, weather, checkpoint/paperwork).
- **Fleet:** Truck classes (configurable table, illustrative values): LCV, ICV, HCV, multi-axle. Capacity in kg and m³, cost per km, fuel efficiency, driver cost per day, max daily driving hours, idle cost, CO₂ factor.
- **Cost parameters (configurable):** diesel price, toll per km, capital cost rate, storage cost per pallet-day, insurance, shrinkage, obsolescence, detention charges.
- **Risks:** register of 25–30 supply chain risks with likelihood, impact, category, owner, mitigation, leading indicators.

**Built-in demo story:** the baseline network deliberately contains an inefficient assignment so the optimizer has a real story. **Chhattisgarh (Raipur/Bhilai cluster) is served from a distant CFA** with long, variable transit times. Nagpur and a candidate Raipur-region transit hub are viable alternates. Also seed: a monsoon-vulnerable eastern corridor; a single-source packaging film supplier (Bottleneck item); a festive demand surge on select SKUs; a CFA near capacity. Improvements produced by the optimizer must be computed, not hard-coded, and land in a plausible band (roughly 8–20% cost or time improvement, not miraculous).

## 6. Desktop apps (functional spec)

Each app is a window with: a toolbar, main workspace, an **Agent Panel** (docked, collapsible), a status bar and app-specific menus. Each app must expose its state to the shared store so the Copilot and other agents can read or act on it.

### 6.1 HUL Network Browser (folder: HUL Network)
A **Mac-style column-view browser** mirroring the flow: `HUL → Warehousing → Category → SKUs → Lanes`. Selecting items updates a preview pane with KPIs, a mini map and charts. Shows warehouse count, SKU count per category (donut), throughput, utilization. "Open in Route Optimizer" and "Open in Inventory Lab" actions on any selected item.

### 6.2 Warehouse Manager
Table and map of warehouses with capacity, utilization, dock load, throughput, cost per pallet-day. Get Info panel per warehouse. **Alternate warehouse finder:** for any distributor cluster, rank candidate warehouses by a weighted score (distance, transit time, cost, capacity headroom, stock availability) with adjustable weights via sliders. Discrete-event dock simulation (Section 8.6) for a "what if we add a dock / shift" test.

### 6.3 Inventory Lab (Inventory Agent)
- **Classification:** ABC (value), XYZ (variability), combined 9-cell matrix (interactive grid).
- **Policy engine:** EOQ, reorder point, safety stock (demand and lead-time variability), (s,S), Min-Max, periodic review (R,S), newsvendor for short shelf-life items, FEFO checks. Recommend a policy per SKU class with a written rationale.
- **Holding cost calculator:** capital + storage + insurance + shrinkage/obsolescence with a breakdown donut and total annual holding cost; per SKU, category and warehouse.
- **Service level vs cost curve:** shows safety stock and holding cost as service level moves 85–99.9%.
- **Multi-echelon view:** plant → CFA → distributor stock with safety stock positioning.
- Agent actions: recompute policies for a selection, find SKUs with excess or stockout risk, generate a **reorder plan**, and compare baseline vs optimized inventory cost.

### 6.4 Planning Desk (Planning Agent)
- **Demand forecasting:** hierarchical (category → brand → SKU × region). Model competition per series by rolling-origin cross-validation: seasonal naive, ETS/Holt-Winters, SARIMAX with festival regressors, LightGBM with calendar/promo features, Croston-SBA for intermittent series. Show forecast vs actuals with prediction intervals, WAPE and bias, and a model leaderboard.
- **S&OP workspace:** demand plan vs supply plan vs capacity, a consensus plan editor with manual override tracking (forecast value-add).
- **Aggregate/production plan:** LP that minimizes production + inventory + backlog cost subject to plant capacity and shelf-life; show plant load bars.
- **Scenario what-ifs:** demand +X% on a category, plant outage, promo uplift.

### 6.5 Route Optimizer (Optimization Agent) — the flagship
Three map modes (tabs) sharing one state, plus linked charts. Details in Section 7.

### 6.6 Freight & Cost Calculator
Total landed logistics cost per trip/lane: fuel, tolls, driver, detention, handling, insurance, overhead. Cost per tonne-km, cost per case, load factor sensitivity, truck class comparison (which class minimises cost per case for this load and distance), rail/coastal alternative as a mode option (configurable assumptions). Carbon estimate per trip (configurable emission factor; cite the GLEC framework as the methodology). Waterfall chart of cost components. Printable "Freight Invoice/Trip Sheet".

### 6.7 Vendor Manager (Kraljic Matrix)
- Interactive 2×2: **Supply Risk (y) × Profit Impact (x)** with quadrants **Non-critical (Routine), Leverage, Bottleneck, Strategic**. Materials plotted as hatched bubbles sized by annual spend.
- Scoring model: transparent weighted criteria for each axis (adjustable weights; show the scores table).
- Strategy panel per quadrant (Strategic: partnership and long-term contracts; Leverage: competitive bidding and volume consolidation; Bottleneck: secure supply, buffer stock, qualify substitutes; Non-critical: simplify, automate, catalogue buying).
- **Agent actions:** re-score after a risk event, recommend sourcing strategy per item, and **feed Bottleneck items into Inventory Lab** as higher safety stock proposals (cross-app link).

### 6.8 SCOR Process Map
SCOR levels 1–2 view: **Plan, Source, Make, Deliver, Return, Enable**. Per process: SCOR performance attributes and metrics (Reliability: perfect order fulfilment; Responsiveness: order fulfilment cycle time; Agility: upside flexibility; Costs: total cost to serve; Asset management: cash-to-cash cycle time, return on fixed assets). Show current vs target vs best-in-class per metric, computed from the simulated operational data. The agent **diagnoses which SCOR process is driving a KPI gap** and links to the responsible app.

### 6.9 Executive Board (Balanced Scorecard)
Four perspectives: **Financial** (cost-to-serve, holding cost, logistics cost as % of sales), **Customer** (OTIF, fill rate), **Internal Process** (forecast accuracy, warehouse utilization, truck fill, transit variability), **Learning & Growth** (planner hours saved, agent action acceptance rate, forecast value-add). Strategy map showing cause-effect links, with KPI cards colour-coded against targets. Baseline vs optimized toggle. Agent generates a one-page executive summary.

### 6.10 Risk Simulator (Risk Heat-Map + Monte Carlo)
- **5×5 Likelihood × Impact heat-map** with the risk register plotted; click a risk for details, mitigation and owner. Inherent vs residual toggle.
- **Monte Carlo engine** (Section 8.5) for lead-time, demand, and disruption uncertainty with histograms, CDF, P50/P90/P95, stockout probability, cost-at-risk (CVaR), convergence chart and a **tornado sensitivity chart**.
- Disruption presets: monsoon closure, supplier failure, strike, warehouse outage, demand spike. Results update heat-map positions dynamically (quantified likelihood/impact from simulation).

### 6.11 Governance (RACI Matrix)
Matrix of decisions/tasks × roles (Demand Planner, Inventory Planner, Warehouse Manager, Logistics Head, Procurement Head, Supply Chain Director, **AI Agent**). Editable R/A/C/I cells. **Enforced in code:** the Agent Gateway checks this matrix before any action. Show an "Approval Queue" listing pending agent plans with Approve/Reject/Modify actions and a role switcher ("Act as: Logistics Head") to demo different permissions. Rule: the AI Agent may be Responsible but never solely Accountable.

### 6.12 Control Tower
Live-feeling (simulated event stream, seeded) alert board: delayed lanes, stock-outs, capacity breaches, weather, supplier alerts. Severity mapped to the heat-map. Each alert has "Ask Agent to Investigate", which launches the relevant agent workflow.

### 6.13 Scenario Compare
Save, name and compare scenarios (baseline vs optimized vs alternatives) side by side: cost, time, utilization, service level, CO₂, risk exposure; waterfall of savings by lever (rerouting, warehouse switch, load consolidation, inventory policy).

### 6.14 Methodology & Assumptions (Help Book)
Pages for every technique used, with the formula, plain-English explanation, where it's used, and its limitations. Data provenance table (Public vs Synthetic). Model cards for forecasting and delay prediction. Glossary. This app is critical for the Content and Q&A marks.

### 6.15 Agent Console (System Log)
Audit trail of every agent run: user request, plan, each tool call (name, inputs, outputs, duration), model used, approvals, and final Plan Card. Filter by agent. Export as JSON. Replay button.

### 6.16 Agent Test Bench
20+ test cases (input prompt, expected tool sequence, expected numerical assertions). "Run all" with pass/fail table and accuracy summary (tool selection accuracy, parameter accuracy, numeric faithfulness). Used as evidence in the report.

### 6.17 Reports
Generate PDF/print views: Dispatch Sheet, Executive Summary, Inventory Policy Report, Scenario Comparison, and a Methodology extract.

## 7. Route Optimizer in detail

**Layout:** left: origin/destination/commodity/constraints form; centre: map workspace with mode tabs; right: agent panel; bottom: linked charts strip. Everything is driven by the shared store, so changing **source** or **destination** immediately recomputes or reloads results and updates all charts.

**Mode 1 — Geographic Map** (MapLibre, monochrome basemap): real road geometry, warehouse/plant/distributor markers, lanes coloured by delay or cost (sage/ochre/brick, plus hatch for accessibility), candidate corridors A/B/C with toggles, corridor risk overlays (monsoon-prone, ghat sections, congestion), alternate-warehouse "reach rings" (isochrone-style approximations), and a route comparison card (baseline vs optimized: distance, time, cost, CO₂, toll, risk).

**Mode 2 — Tactical Map** (D3): a **schematic network diagram** in the style of a metro or command-centre map. Nodes on a stylised grid, edges drawn with orthogonal/45° lines, thickness = volume, pattern = status, node glyph = type (plant, CFA, depot, distributor). Shows flows, bottlenecks, capacity utilization rings and the reassignment as animated transitions (dashed marching pattern, no glow). Filters by category and by time bucket.

**Mode 3 — Multi-Route Dispatch Map:** choose a CFA (or multiple for multi-depot) and a set of distributor drops; solver builds multiple vehicle routes. Each vehicle has its own line pattern/colour, numbered stops, load fill bar (weight and volume), ETA per stop against time windows, and a **Gantt timeline** (driving, unloading, waiting, rest). Click a route to highlight its stops, chart and Gantt row (cross-highlighting everywhere). Drag a stop to a different vehicle to manually re-plan; the solver re-validates and shows the cost delta.

**Linked charts (must respond to source/destination changes):** cost breakdown donut (fuel/toll/driver/handling/detention), truck utilization bars (weight vs volume), ETA distribution (histogram with P50/P90 markers from Monte Carlo), delay-cause decomposition stacked bar, cost per tonne-km across corridors, and a baseline vs optimized waterfall.

**Chhattisgarh scenario (must work end-to-end):** the user (or agent) selects Raipur cluster; the system detects the lane's delay against benchmark, decomposes the delay causes, lists alternate warehouses ranked by score, proposes the best corridor(s), recommends truck class and load changes (bigger or smaller trucks, consolidation of drops), quantifies the change with Monte Carlo, and produces an approvable Plan Card.

## 8. Algorithms and techniques (implement exactly; expose in Methodology app)

### 8.1 Road network and shortest path
Precomputed road matrix (distance, duration) via OSRM/ORS; Dijkstra/A* on a simplified corridor graph for candidate path enumeration; **Yen's k-shortest paths** (k=3–5) to generate alternate corridors; corridor scoring = weighted time + cost + toll + risk penalty (monsoon/ghat) + variability.

### 8.2 Vehicle Routing
- **CVRP** (weight and volume capacity), **VRPTW** (delivery windows), **heterogeneous fleet** (choose truck class mix), **multi-depot VRP**, max driving hours per day, unloading service times, and an **e-way bill validity check** (roughly 1 day per 200 km of distance; verify and make configurable).
- Construction: **Clarke-Wright savings** initial solution. Improvement: 2-opt, Or-opt, and OR-Tools **Guided Local Search** with a time limit. Optional ALNS variant for comparison.
- Objective: total cost (fixed truck cost + distance cost + time cost + penalty for lateness), with a secondary objective option to minimize number of trucks or to minimize CO₂.
- Show solver metadata: method, iterations/time, gap vs lower bound where available, and "why this route" explanation.

### 8.3 Warehouse allocation and network design
- **Alternate warehouse ranking:** multi-criteria weighted scoring (min-max normalised criteria).
- **Allocation:** transportation problem / min-cost flow (LP/MIP) assigning distributor demand to CFAs under capacity constraints, with option to force or ban a warehouse (outage test).
- **Facility location:** p-median and centre-of-gravity analysis for "where should the next hub be" with sensitivity to the number of hubs.

### 8.4 Load optimization
3-D-lite bin packing using **First Fit Decreasing** by weight and volume with stackability rules; report weight-utilization and cube-utilization separately; recommend truck class up/down-sizing; show what mix of SKUs fills the truck best (a knapsack-style consolidation helper).

### 8.5 Monte Carlo simulation
10,000 seeded iterations (configurable). Sample:
- lead times (lognormal or gamma, lane-specific, with monsoon-season shift),
- demand (normal, negative binomial, or Poisson depending on velocity),
- disruption events (Bernoulli with duration distribution),
- correlation between monsoon and transit delay via a **Gaussian copula** (optional).
Use **Latin Hypercube sampling** option for faster convergence.

Outputs: P50/P90/P95 transit time, on-time probability, stockout probability, expected shortage cost, **CVaR(95%) of total cost**, convergence plot, and **one-at-a-time tornado sensitivity**. Compare baseline vs optimized distributions on the same random numbers (common random numbers) so the improvement is statistically fair.

### 8.6 Discrete-event simulation
SimPy model for a CFA dock: Poisson truck arrivals, service time distributions, N docks, shifts; outputs queue wait, dock utilization, trucks/day capacity, effect of adding docks or extending shifts.

### 8.7 Inventory
- EOQ = √(2DS/H). Safety stock = z·√(L·σ_d² + d̄²·σ_L²). ROP = d̄·L + SS. (s,S) with simulation-based tuning. Newsvendor: critical ratio Cu/(Cu+Co). FEFO with shelf-life remaining checks.
- **ABC-XYZ**, service-level–cost trade-off curve, multi-echelon safety stock positioning (guaranteed-service model approximation).
- Holding cost rate decomposed into capital, storage, insurance, shrinkage, and obsolescence components.

### 8.8 Forecasting
Rolling-origin cross-validation; model selection per series by WAPE; prediction intervals; hierarchical reconciliation (top-down proportions and bottom-up sum, and a simple optimal-combination option); festival/promo regressors; intermittent demand handled with Croston-SBA; report WAPE, bias and forecast value-add against a naive baseline.

### 8.9 Delay analytics and ETA
Lane benchmarking (planned vs actual), gradient-boosted ETA model with features (distance, corridor, season, weather flag, day-of-week, hub dwell), Isolation Forest / z-score anomaly detection to flag anomalous lanes, and delay-cause decomposition with a root-cause ranking.

### 8.10 Frameworks logic
- **Kraljic** scoring: weighted criteria per axis (supply risk: number of suppliers, switching cost, lead-time variability, geopolitical exposure; profit impact: % of spend, effect on product cost, criticality to revenue).
- **SCOR** metrics computed from data; gap analysis vs target.
- **Risk heat-map:** score = likelihood × impact; residual after mitigation; simulation-informed re-rating.
- **Balanced Scorecard:** KPI tree with weights and cause-effect links.
- **RACI:** enforced authorization matrix.

## 9. Agent architecture

### 9.1 Agents
- **Copilot (Orchestrator/Supervisor):** always available (⌘/Ctrl+K and in the menu bar). Understands intent, decomposes tasks, delegates to specialist agents, opens/focuses windows, and aggregates results.
- **Inventory Agent, Planning Agent, Optimization Agent** (the three headline agents matching the project topic).
- **Specialist agents:** Sourcing Agent (Kraljic), Risk Agent (Monte Carlo/heat-map), Cost Agent (freight/holding costs), Governance Agent (RACI/approvals), Analyst Agent (SCOR/Balanced Scorecard).

### 9.2 Loop
Plan → select tools → execute → validate (unit checks, sanity bounds, constraint checks) → if invalid, retry or repair → summarise → produce a **Plan Card** (recommendation, before/after KPIs, assumptions, risks, required approvals per RACI) → wait for human decision → on approval, "commit" updates the scenario state and logs to the Agent Console.

### 9.3 Tool registry (JSON Schema for each; implement as typed functions)
Data and analysis: `get_lane_performance`, `decompose_delay_causes`, `find_alternate_warehouses`, `get_sku_portfolio`, `get_warehouse_status`.
Optimization: `optimize_route`, `solve_multi_route_dispatch`, `allocate_demand_to_warehouses`, `optimize_truck_load`, `evaluate_truck_class_mix`.
Inventory: `classify_abc_xyz`, `compute_inventory_policy`, `compute_holding_cost`, `generate_reorder_plan`, `service_level_cost_curve`.
Planning: `forecast_demand`, `run_sop_scenario`, `optimize_production_plan`.
Risk: `run_monte_carlo`, `score_risk_register`, `run_disruption_scenario`, `simulate_dock_queue`.
Cost: `calculate_freight_cost`, `estimate_emissions`.
Frameworks: `score_kraljic`, `compute_scor_metrics`, `compute_scorecard`, `check_raci_permission`.
UI actions: `open_app`, `set_route_endpoints`, `set_map_mode`, `highlight_entity`, `fill_form`, `create_scenario`, `compare_scenarios`, `generate_report`, `request_approval`.

Each tool returns `{tool_run_id, inputs, outputs, units, assumptions, warnings}`.

### 9.4 Agent guardrails
- Numbers in responses must match tool outputs; a post-processor checks that every number in the agent message appears in a referenced tool result (or is a trivial derivation) and flags mismatches.
- Refuse or ask when required inputs or data are missing; never invent data.
- RACI check before any commit action; log denials.
- Limit tool-call loops (max steps) and show the step trace live in the Agent Panel.
- Show confidence and key assumptions on every Plan Card.

### 9.5 Agent Panel UX
Streaming step trace ("Reading lane data… Running optimizer… Simulating 10,000 scenarios…"), collapsible tool-call details, a Plan Card with **Approve / Modify / Reject**, suggested next actions, and cross-agent handoffs shown explicitly (e.g., "Optimization Agent → asked Inventory Agent to check stock at Nagpur CFA").

### 9.6 Scripted mode (no API key)
An intent matcher plus deterministic workflow scripts for the six canonical scenarios below produces the same tool sequences and Plan Cards without an LLM. Free-text outside these scenarios shows a helpful message listing supported requests.

### 9.7 Canonical demo scenarios (must be fully working)
1. **Slow lane in Chhattisgarh:** diagnose delay, alternate warehouse, better corridor, truck load change, Monte Carlo confirmation, approval.
2. **Monsoon disruption on the eastern corridor:** reallocate demand, buffer stock, updated heat-map, updated cost-at-risk.
3. **Packaging film shortage (Bottleneck item):** Kraljic re-score, sourcing strategy, safety stock increase, production impact.
4. **Festive demand surge:** forecast, S&OP gap, production plan, inventory policy update, transport capacity check.
5. **Truck utilization improvement:** consolidation, class mix, cost and CO₂ deltas.
6. **Warehouse outage:** forced reallocation, dock/queue effects, service impact, RACI approval flow.

## 10. Shared state and integration
Zustand store with: `scenario`, `selection` (entity IDs), `mapState` (source, destination, mode, filters), `results` (cache keyed by tool_run_id), `approvals`, `logs`, `role`, `settings`. Any app change writes to the store; any app can react. Undo/redo for scenario edits. All solver results are cached by hash of inputs.

## 11. Performance and quality
- First load under 3s on a normal connection; solver calls show progress; heavy work off the main thread (Web Workers for client-side simulation fallbacks).
- Accessibility: full keyboard navigation for windows/menus, visible focus indicators (dither outline), sufficient contrast, hatch patterns so meaning is never colour-only.
- Error handling: every solver/LLM/network failure produces a classic-style alert dialog with a retry and "use cached results" option.
- Unit tests for all formulas and solvers (property tests for bin packing and routing feasibility). Agent evaluation harness (Section 6.16).
- Lint, type-check, and a CI script.

## 12. Repository structure (suggested)
```
/apps/web            Next.js app (shell, windows, apps, charts, maps, agents UI)
/apps/solver         FastAPI service (routing, forecasting, simulation, inventory)
/data                generated JSON + ASSUMPTIONS.md
/scripts             generate_data.py, precompute.py, build_road_matrix.py
/packages/schemas    shared types + JSON Schemas for tools
/docs                METHODOLOGY.md, AGENTS.md, DEMO_SCRIPT.md, DECISIONS.md
docker-compose.yml   README.md
```

## 13. Documentation deliverables (generate these too)
- `README.md` with setup (local, Docker, Vercel), env vars, and troubleshooting.
- `docs/METHODOLOGY.md` mirroring the Methodology app.
- `docs/AGENTS.md`: agent roles, tool registry, guardrails, example traces.
- `docs/DEMO_SCRIPT.md`: a **5-minute scripted demo** around the Chhattisgarh story that touches all frameworks, with one segment per team member and fallback steps if a service is down.
- `docs/QA_PREP.md`: 40 likely viva questions with concise answers (e.g., "Why Kraljic for a manufacturer?", "How do you prevent the agent from making wrong decisions?", "What is synthetic and what is real?", "Why Monte Carlo and not deterministic averages?", "How does RACI govern the agent?").

## 14. Rubric alignment (for our own checking)
- **Content (15):** all six frameworks live and data-driven; AI analytics techniques implemented and explained; baseline vs optimized results; limitations documented.
- **Delivery (5):** scripted 5-minute story; per-member segments; resilient demo mode.
- **Visuals (5):** cohesive Paper OS identity, hatch-pattern charts, three polished map modes, no generic look.
- **Q&A (5):** Methodology app and QA_PREP.md provide defensible answers; Agent Console shows traceability.

## 15. Things to avoid
Hard-coded improvement numbers; LLM-generated figures; default chart/map themes; pure black/white and neon accents; emoji icons; unlabelled synthetic data; features that only work with a live API key; huge single-file components; placeholder "Lorem ipsum" or dead buttons (every visible control must work or be removed).

## 16. Definition of done
- All 16 apps open, function, and share state.
- All six canonical scenarios run end-to-end in both Live and Scripted modes.
- The Route Optimizer's three map modes update from source/destination changes together with the linked charts.
- RACI gating verified by tests (agent cannot commit without approval).
- Agent Test Bench passes at least 90% of cases.
- Visual review: screenshots at 1440×900 and 1920×1080 show no overlap, clipping or default-library styling.
- Docs generated and demo script rehearsed.

## 17. Build phases (with acceptance criteria)

**Phase 0 — Plan.** Implementation Plan + Task List artifacts; confirm stack and folder structure.
*Acceptance:* plan covers all sections; risks and decisions listed.

**Phase 1 — Design system and desktop shell.** Tokens, fonts, icon set, window manager, menu bar with contextual menus, desktop icons, folders, dialogs, Control Panel, Trash, About box.
*Acceptance:* windows drag/resize/focus/minimize/zoom; menus change per app; theme switch works; screenshots match Section 4.

**Phase 2 — Data and solver foundation.** Synthetic data generator, schemas, road matrix, precompute scripts, FastAPI skeleton, cached fallback, shared store.
*Acceptance:* data validates; solver health endpoint; app runs offline on cached data.

**Phase 3 — Network Browser, Warehouse Manager, Freight Calculator.**
*Acceptance:* column-view drill-down works; alternate warehouse ranking changes with weight sliders; cost breakdown correct against unit tests.

**Phase 4 — Route Optimizer (all three modes) + linked charts.**
*Acceptance:* changing source/destination updates map, routes and charts; CVRP/VRPTW solutions are feasible (tests); Chhattisgarh scenario produces ranked alternates and a Plan Card.

**Phase 5 — Inventory Lab and Planning Desk.**
*Acceptance:* ABC-XYZ grid, policies and holding cost verified by tests; forecast leaderboard with WAPE; S&OP and production LP results consistent with capacity.

**Phase 6 — Framework apps:** Vendor Manager (Kraljic), SCOR Map, Executive Board (Balanced Scorecard), Risk Simulator (heat-map + Monte Carlo + DES), Governance (RACI + Approval Queue).
*Acceptance:* each framework is interactive, data-driven, and linked to at least one other app; Monte Carlo reproducible with seed; RACI blocks unauthorised commits.

**Phase 7 — Agents.** Tool registry, orchestrator, specialist agents, Plan Cards, approval flow, Agent Console, scripted mode, six canonical scenarios.
*Acceptance:* all scenarios pass in Scripted and Live modes; numbers verified by the faithfulness checker; Agent Test Bench ≥90%.

**Phase 8 — Control Tower, Scenario Compare, Reports, Methodology, Test Bench.**
*Acceptance:* alerts launch agent investigations; scenario comparison and PDF/print reports work; Methodology app complete.

**Phase 9 — Polish, docs and rehearsal.** Performance, accessibility, empty/error states, README, DEMO_SCRIPT, QA_PREP, final screenshots and Walkthrough artifact.
*Acceptance:* Definition of done (Section 16) fully checked.

---
*End of spec.*
