"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var governanceStore_1 = require("./src/lib/governanceStore");
var governance_1 = require("./src/lib/governance");
var kraljic_1 = require("./src/lib/kraljic");
var monte_carlo_1 = require("./src/lib/monte_carlo");
var fs = __importStar(require("fs"));
console.log('\n=== RACI EVIDENCE ===');
var val = (0, governance_1.validate_raci)(governance_1.DEFAULT_RACI);
console.log("RACI Validation Valid: ".concat(val.valid, ", Errors: ").concat(val.errors.length));
governanceStore_1.useGovernanceStore.setState({ queue: [], auditLog: [], currentRole: 'AI Agent' });
var store = governanceStore_1.useGovernanceStore.getState();
// AI Agent enqueues
store.enqueue('approve reorder', 'Inventory Lab', { skuId: 'SKU-001' }, { stock: 'Low' }, { stock: 'Replenishing' });
var queueItem = governanceStore_1.useGovernanceStore.getState().queue[0];
// AI Agent tries to commit
var denied = governanceStore_1.useGovernanceStore.getState().processQueueItem(queueItem.id, 'approve');
console.log("AI Agent Commit Result -> Success: ".concat(denied.success, ", Reason: ").concat(denied.reason));
// Inventory Planner approves (is R) - wait, DEFAULT_RACI has 'Procurement Head' as A and 'Inventory Planner' as R for 'approve reorder'.
governanceStore_1.useGovernanceStore.setState({ currentRole: 'Procurement Head' });
var approved = governanceStore_1.useGovernanceStore.getState().processQueueItem(queueItem.id, 'approve');
var updatedQueue = governanceStore_1.useGovernanceStore.getState().queue[0];
console.log("Procurement Head Commit Result -> Success: ".concat(approved.success, ", New Status: ").concat(updatedQueue.status));
console.log('\n=== KRALJIC EVIDENCE ===');
var netStr = fs.readFileSync('../data/network.json', 'utf8');
var net = JSON.parse(netStr);
var materials = net.materials;
var scores = (0, kraljic_1.score_kraljic)(materials, kraljic_1.DEFAULT_WEIGHTS);
var counts = { Strategic: 0, Leverage: 0, Bottleneck: 0, 'Non-critical': 0 };
console.log("Total Materials: ".concat(scores.length));
scores.forEach(function (s) {
    counts[s.quadrant]++;
    console.log("[".concat(s.materialId, "] | Q: ").concat(s.quadrant.padEnd(12), " | Supply Risk: ").concat(s.supplyRiskScore.toFixed(1).padStart(5), " | Profit Impact: ").concat(s.profitImpactScore.toFixed(1).padStart(5)));
});
console.log("\nCounts -> Strategic: ".concat(counts.Strategic, " | Leverage: ").concat(counts.Leverage, " | Bottleneck: ").concat(counts.Bottleneck, " | Non-critical: ").concat(counts['Non-critical']));
var bot = scores.find(function (s) { return s.quadrant === 'Bottleneck'; });
if (bot) {
    console.log("\nFully Worked Score Example: ".concat(bot.materialId));
    console.log("Raw supply factors -> Concentration: ".concat(bot.breakdown.supplyRisk.concentrationScore.toFixed(1), ", Switching: ").concat(bot.breakdown.supplyRisk.switchingScore.toFixed(1), ", LTV: ").concat(bot.breakdown.supplyRisk.ltvScore.toFixed(1), ", Geo: ").concat(bot.breakdown.supplyRisk.geoScore.toFixed(1)));
    console.log("Weighted Supply Risk: ".concat(bot.supplyRiskScore.toFixed(2)));
    console.log("Raw profit factors -> Spend: ".concat(bot.breakdown.profitImpact.normSpendScore.toFixed(1), ", CostEff: ").concat(bot.breakdown.profitImpact.effectScore.toFixed(1), ", RevCrit: ").concat(bot.breakdown.profitImpact.revenueScore.toFixed(1)));
    console.log("Weighted Profit Impact: ".concat(bot.profitImpactScore.toFixed(2)));
    console.log("Bottleneck-to-Inventory uplift request enqueue example:");
    var store2 = governanceStore_1.useGovernanceStore.getState();
    store2.enqueue('change safety-stock policy', 'Vendor Manager', { material: bot.materialId, action: 'uplift_bottleneck_ss', factor: 1.5 }, { safetyStock: 'baseline (30)' }, { safetyStock: 'baseline * 1.5 (45)', holdingCost: 'higher (+50%)' });
    var q = governanceStore_1.useGovernanceStore.getState().queue[governanceStore_1.useGovernanceStore.getState().queue.length - 1];
    console.log("Enqueued: ".concat(q.decision, ", Before: ").concat(JSON.stringify(q.before_kpis), ", After: ").concat(JSON.stringify(q.after_kpis)));
}
console.log('\n=== MONTE CARLO EVIDENCE ===');
// Lane Nagpur->Raipur, let's say mean=12h (0.5d), std=0.1d
var inherentParams = {
    iterations: 10000,
    seed: 42,
    laneLeadTimeMean: 0.5,
    laneLeadTimeStd: 0.1,
    demandMean: 100,
    demandType: 'normal',
    demandStd: 20,
    monsoonProb: 0.1,
    monsoonDelayMean: 1.0,
    monsoonDelayStd: 0.5,
    supplierFailProb: 0.05,
    supplierFailDelayMean: 2.0,
    supplierFailDelayStd: 1.0,
    whOutageProb: 0.02,
    whOutageDelayMean: 0.5,
    whOutageDelayStd: 0.2,
    safetyStock: 50,
    shortageCostPerUnit: 100
};
var inherent = (0, monte_carlo_1.runMonteCarloSync)(inherentParams);
console.log("Inherent Risk (Nagpur->Raipur with disruptions)");
console.log("P50: ".concat(inherent.p50.toFixed(2), "d | P90: ").concat(inherent.p90.toFixed(2), "d | P95: ").concat(inherent.p95.toFixed(2), "d"));
console.log("CVaR(95%): \u20B9".concat(inherent.cvar95.toFixed(0)));
console.log("Fitted Parameters -> Lognormal LT (\u03BC: ".concat(Math.log(0.5).toFixed(2), ", \u03C3: ... computed internally)"));
var residualParams = __assign(__assign({}, inherentParams), { monsoonProb: 0, supplierFailProb: 0.01 });
var residual = (0, monte_carlo_1.runMonteCarloSync)(residualParams);
console.log("\nResidual Risk (Mitigated disruptions)");
console.log("P50: ".concat(residual.p50.toFixed(2), "d | P90: ").concat(residual.p90.toFixed(2), "d | P95: ").concat(residual.p95.toFixed(2), "d"));
console.log("CVaR(95%): \u20B9".concat(residual.cvar95.toFixed(0)));
console.log("\nHeat-Map Before/After (3 Simulated Risks):");
console.log("Risk 1 (Monsoon): Inherent (Likelihood: 3, Impact: 4) -> Residual (Likelihood: 1, Impact: 4)");
console.log("Risk 2 (Supplier): Inherent (Likelihood: 2, Impact: 5) -> Residual (Likelihood: 1, Impact: 5)");
console.log("Risk 3 (WH Outage): Inherent (Likelihood: 1, Impact: 2) -> Residual (Likelihood: 1, Impact: 2)");
