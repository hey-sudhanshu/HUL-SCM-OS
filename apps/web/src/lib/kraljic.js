"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_WEIGHTS = void 0;
exports.score_kraljic = score_kraljic;
exports.DEFAULT_WEIGHTS = {
    supplyRisk: {
        supplierConcentration: 0.4,
        switchingCost: 0.2,
        leadTimeVariability: 0.2,
        geographicExposure: 0.2
    },
    profitImpact: {
        shareOfSpend: 0.5,
        effectOnProductCost: 0.3,
        revenueCriticality: 0.2
    }
};
function score_kraljic(materials, weights, cutoffs) {
    if (weights === void 0) { weights = exports.DEFAULT_WEIGHTS; }
    if (cutoffs === void 0) { cutoffs = { risk: 50, profit: 50 }; }
    // We need to normalize some fields across all materials to score them 0-100
    var maxSwitchingCost = Math.max.apply(Math, materials.map(function (m) { return m.switching_cost; }));
    return materials.map(function (m) {
        // Supply Risk factors (0-100)
        // supplierConcentration: 1 supplier = 100, 2 = 80, 5 = 40, >10 = 10
        var concentrationScore = m.supplier_count === 1 ? 100 : Math.max(10, 100 - (m.supplier_count - 1) * 10);
        var switchingScore = (m.switching_cost / (maxSwitchingCost || 1)) * 100;
        var ltvScore = Math.min(100, m.lead_time_variability * 100);
        var geoScore = m.geographic_exposure * 100;
        var supplyRiskScore = (concentrationScore * weights.supplyRisk.supplierConcentration) +
            (switchingScore * weights.supplyRisk.switchingCost) +
            (ltvScore * weights.supplyRisk.leadTimeVariability) +
            (geoScore * weights.supplyRisk.geographicExposure);
        // Profit Impact factors (0-100)
        var spendScore = m.share_of_spend * 100; // already 0-1, but wait, share is usually small.
        // actually, let's just use effect_on_product_cost * 100 and revenue_criticality * 100
        // for share of spend, let's normalize by max share to spread it
        var maxShare = Math.max.apply(Math, materials.map(function (x) { return x.share_of_spend; }));
        var normSpendScore = (m.share_of_spend / (maxShare || 1)) * 100;
        var effectScore = m.effect_on_product_cost * 100;
        var revenueScore = m.revenue_criticality * 100;
        var profitImpactScore = (normSpendScore * weights.profitImpact.shareOfSpend) +
            (effectScore * weights.profitImpact.effectOnProductCost) +
            (revenueScore * weights.profitImpact.revenueCriticality);
        var quadrant;
        var strategy;
        if (supplyRiskScore >= cutoffs.risk && profitImpactScore >= cutoffs.profit) {
            quadrant = 'Strategic';
            strategy = 'Partnership and long-term contracts';
        }
        else if (supplyRiskScore < cutoffs.risk && profitImpactScore >= cutoffs.profit) {
            quadrant = 'Leverage';
            strategy = 'Competitive bidding and volume consolidation';
        }
        else if (supplyRiskScore >= cutoffs.risk && profitImpactScore < cutoffs.profit) {
            quadrant = 'Bottleneck';
            strategy = 'Secure supply, buffer stock, qualify substitutes';
        }
        else {
            quadrant = 'Non-critical';
            strategy = 'Simplify, automate, catalogue buying';
        }
        return {
            materialId: m.id,
            supplyRiskScore: supplyRiskScore,
            profitImpactScore: profitImpactScore,
            quadrant: quadrant,
            strategy: strategy,
            breakdown: {
                supplyRisk: { concentrationScore: concentrationScore, switchingScore: switchingScore, ltvScore: ltvScore, geoScore: geoScore },
                profitImpact: { normSpendScore: normSpendScore, effectScore: effectScore, revenueScore: revenueScore }
            }
        };
    });
}
