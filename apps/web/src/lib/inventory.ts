const uuidv4 = () => Math.random().toString(36).substring(7);

export type InventoryConfig = {
    abcThresholds: { a: number; b: number };
    xyzThresholds: { x: number; y: number };
    serviceLevels: { a: number; b: number; c: number };
    baselineCoverDays: number;
};

export const DEFAULT_INV_CONFIG: InventoryConfig = {
    abcThresholds: { a: 0.80, b: 0.95 }, // Cumulative values: A=80%, B=15% (up to 95%), C=5%
    xyzThresholds: { x: 0.26, y: 0.265 }, // CV thresholds
    serviceLevels: { a: 0.98, b: 0.95, c: 0.90 },
    baselineCoverDays: 30
};

// Pure Functions returning {tool_run_id, inputs, outputs, units, assumptions, warnings}

export function classify_abc_xyz(skus: any[], demandHistory: any, config: InventoryConfig = DEFAULT_INV_CONFIG) {
    const runId = uuidv4();
    const warnings: string[] = [];
    
    // 1. Calculate annual value and demand stats per SKU
    const skuStats = skus.map(sku => {
        // Aggregate demand across all regions for the SKU
        let totalDemand = 0;
        let weeklyDemands: number[] = new Array(156).fill(0);
        
        const history = demandHistory[sku.id];
        if (history) {
            Object.values(history).forEach((regionSeries: any) => {
                regionSeries.forEach((val: number, idx: number) => {
                    weeklyDemands[idx] += val;
                });
            });
        } else {
            warnings.push(`No demand history for ${sku.id}`);
        }
        
        const mean = weeklyDemands.reduce((a,b)=>a+b, 0) / 156;
        const variance = weeklyDemands.reduce((a,b)=>a + Math.pow(b - mean, 2), 0) / 156;
        const stdDev = Math.sqrt(variance);
        const cv = mean > 0 ? stdDev / mean : 0;
        
        const annualVolume = mean * 52;
        const annualValue = annualVolume * sku.unit_cost;
        
        return {
            sku_id: sku.id,
            mean, stdDev, cv, annualValue
        };
    });
    
    // 2. ABC Classification
    skuStats.sort((a,b) => b.annualValue - a.annualValue);
    const totalValue = skuStats.reduce((sum, s) => sum + s.annualValue, 0);
    
    let cumValue = 0;
    const classifications = skuStats.map(s => {
        cumValue += s.annualValue;
        const pct = cumValue / totalValue;
        
        let abc = 'C';
        if (pct <= config.abcThresholds.a) abc = 'A';
        else if (pct <= config.abcThresholds.b) abc = 'B';
        
        let xyz = 'Z';
        if (s.cv <= config.xyzThresholds.x) xyz = 'X';
        else if (s.cv <= config.xyzThresholds.y) xyz = 'Y';
        
        return { ...s, class: `${abc}${xyz}`, abc, xyz };
    });
    
    // 9-cell grid aggregate
    const grid = {
        AX: [], AY: [], AZ: [],
        BX: [], BY: [], BZ: [],
        CX: [], CY: [], CZ: []
    } as Record<string, string[]>;
    
    classifications.forEach(c => {
        grid[c.class].push(c.sku_id);
    });

    return {
        tool_run_id: runId,
        inputs: { sku_count: skus.length, config },
        outputs: { classifications, grid },
        units: { annualValue: 'INR', cv: 'ratio' },
        assumptions: ['Demand history is 156 weeks', 'Annualized by multiplying weekly mean by 52'],
        warnings
    };
}

// Z-scores for service levels
const zScores: Record<number, number> = {
    0.85: 1.04, 0.90: 1.28, 0.95: 1.645, 0.98: 2.05, 0.99: 2.33, 0.999: 3.09
};
function getZ(sl: number) {
    // Interpolate or find closest
    const levels = [0.85, 0.90, 0.95, 0.98, 0.99, 0.999];
    const closest = levels.reduce((prev, curr) => Math.abs(curr - sl) < Math.abs(prev - sl) ? curr : prev);
    return zScores[closest];
}

export function compute_inventory_policy(sku: any, abc_xyz: string, meanD: number, stdD: number, meanL: number, stdL: number, costParams: any, targetSL: number) {
    const runId = uuidv4();
    const warnings: string[] = [];
    
    // Convert Lead time from hours to weeks if meanD is weekly.
    // Let's assume meanL and stdL are in days.
    // Convert daily lead time to weekly since demand is weekly.
    
    const L_weeks = meanL / 7;
    const stdL_weeks = stdL / 7;
    
    // Holding cost per unit: Capital=15%, Storage=Rs 15/pallet/day, Insurance=0.05%, Shrinkage=2%
    // Ensure capital is largest. 15% is standard. 
    const capitalHC = sku.unit_cost * costParams.capital_cost_rate;
    const storageHC = (costParams.storage_cost_per_pallet_day || 15) * 365 * (sku.volume_m3 / 1.5);
    const insuranceHC = sku.unit_cost * (costParams.insurance_rate || 0.0005);
    const shrinkageHC = sku.unit_cost * (costParams.shrinkage_rate || 0.02);
    const H = capitalHC + storageHC + insuranceHC + shrinkageHC;
    
    // Set ordering cost S from transport per-shipment cost (approx Rs 25,000 for a truck)
    const S = 25000;
    
    // Truck MOQ (assume 16,000 kg capacity)
    const MOQ_units = Math.floor(16000 / sku.weight_kg) || 1;
    
    const annualD = meanD * 52;
    
    // EOQ
    let eoq = H > 0 ? Math.sqrt((2 * annualD * S) / H) : 0;
    // Enforce MOQ multiples
    eoq = Math.max(MOQ_units, Math.ceil(eoq / MOQ_units) * MOQ_units);
    
    const z = getZ(targetSL);
    const ss = z * Math.sqrt((L_weeks * Math.pow(stdD, 2)) + (Math.pow(meanD, 2) * Math.pow(stdL_weeks, 2)));
    
    // ROP = Pipeline Stock + SS
    const pipeline = meanD * L_weeks;
    const rop = pipeline + ss;
    
    // Expected shortfall (approx using normal loss function for normal demand, simplified here as 0 for high SL)
    const expected_shortfall = (1 - targetSL) * eoq; // Simplistic approximation

    
    // Newsvendor for short shelf life (e.g., < 90 days)
    let newsvendor_cr = 0;
    let policy_type = 'Min-Max (s, S)';
    let rationale = `Standard Min-Max chosen for ${abc_xyz} items to balance order frequency and holding cost.`;
    
    if (sku.shelf_life_days < 90) {
        policy_type = 'Newsvendor';
        const Cu = sku.unit_cost * 0.4; // Margin estimate
        const Co = sku.unit_cost; // Loss on expiry
        newsvendor_cr = Cu / (Cu + Co);
        rationale = `Short shelf life (${sku.shelf_life_days} days) triggers single-period Newsvendor logic. Critical Ratio: ${newsvendor_cr.toFixed(2)}`;
    } else if (abc_xyz.startsWith('A')) {
        policy_type = 'Continuous Review (s, S)';
        rationale = 'High value A-class requires continuous monitoring to minimize stockouts.';
    } else if (abc_xyz.startsWith('C')) {
        policy_type = 'Periodic Review (R, S)';
        rationale = 'Low value C-class can be reviewed periodically to save administrative effort.';
    }

    return {
        tool_run_id: runId,
        inputs: { sku_id: sku.id, abc_xyz, meanD, stdD, meanL, stdL, targetSL },
        outputs: { 
            eoq, ss, rop, pipeline, expected_shortfall, policy_type, rationale, newsvendor_cr,
            s_min: rop, s_max: rop + eoq
        },
        units: { eoq: 'units', ss: 'units', rop: 'units' },
        assumptions: ['Ordering cost S=₹500', 'Pallet volume approx 1.5m3', 'Lead time in days converted to weeks'],
        warnings
    };
}

export function compute_holding_cost(sku: any, qty: number, costParams: any) {
    const runId = uuidv4();
    const capital = sku.unit_cost * costParams.capital_cost_rate * qty;
    const storage = costParams.storage_cost_per_pallet_day * 365 * (sku.volume_m3 / 1.5) * qty;
    const insurance = sku.unit_cost * qty * (costParams.insurance_rate || 0.0005);
    const shrinkage = sku.unit_cost * qty * (costParams.shrinkage_rate || 0.02);
    
    const total = capital + storage + insurance + shrinkage;
    
    return {
        tool_run_id: runId,
        inputs: { sku_id: sku.id, qty },
        outputs: { capital, storage, insurance, shrinkage, total },
        units: { total: 'INR/year' },
        assumptions: ['Shrinkage = 2%', 'Insurance = 0.05%'],
        warnings: []
    };
}

export function service_level_cost_curve(sku: any, meanD: number, stdD: number, L_weeks: number, costParams: any) {
    const runId = uuidv4();
    const levels = [0.85, 0.90, 0.95, 0.98, 0.99, 0.999];
    const curve = levels.map(sl => {
        const z = getZ(sl);
        const ss = z * Math.sqrt((L_weeks * Math.pow(stdD, 2))); // ignoring lead time variance for simple curve
        const hc = compute_holding_cost(sku, ss, costParams).outputs.total;
        return { sl, ss, holding_cost: hc };
    });
    
    return {
        tool_run_id: runId,
        inputs: { sku_id: sku.id },
        outputs: { curve },
        units: { holding_cost: 'INR/year', sl: 'ratio', ss: 'units' },
        assumptions: ['Lead time variance 0 for curve simplification'],
        warnings: []
    };
}

export function generate_reorder_plan(inventory: any[], policies: Record<string, any>) {
    const runId = uuidv4();
    const plan = [];
    
    for (const inv of inventory) {
        const pol = policies[inv.sku_id];
        if (!pol) continue;
        
        const available = inv.on_hand + inv.in_transit;
        if (available <= pol.rop) {
            const order_qty = Math.max(0, pol.s_max - available);
            if (order_qty > 0) {
                plan.push({
                    sku_id: inv.sku_id,
                    cfa_id: inv.cfa_id,
                    available,
                    rop: pol.rop,
                    order_qty,
                    urgency: inv.days_of_cover, // Lower is more urgent
                    days_of_cover: inv.days_of_cover, story: inv.story || 'Normal',
                    cost: order_qty // Unit cost injected later
                });
            }
        }
    }
    
    plan.sort((a,b) => a.urgency - b.urgency);
    
    return {
        tool_run_id: runId,
        inputs: { items_checked: inventory.length },
        outputs: { plan },
        units: { urgency: 'ratio' },
        assumptions: [],
        warnings: []
    };
}

export function risk_pooling(sku: any, meanD: number, stdD: number, targetSL: number, L_weeks: number, num_distributors: number) {
    const runId = uuidv4();
    const z = getZ(targetSL);
    
    // CFA Level (Centralized)
    const ss_cfa = z * Math.sqrt(L_weeks * Math.pow(stdD, 2));
    
    // Distributor Level (Decentralized)
    // Assuming identical normally distributed demand across N distributors
    const stdD_dist = stdD / Math.sqrt(num_distributors);
    const ss_dist_single = z * Math.sqrt(L_weeks * Math.pow(stdD_dist, 2));
    const ss_decentralized = ss_dist_single * num_distributors;
    
    return {
        tool_run_id: runId,
        inputs: { num_distributors },
        outputs: { ss_cfa, ss_decentralized, savings: ss_decentralized - ss_cfa },
        units: { ss_cfa: 'units' },
        assumptions: ['Demand perfectly independent across distributors'],
        warnings: []
    };
}
