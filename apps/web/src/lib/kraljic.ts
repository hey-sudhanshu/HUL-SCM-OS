
export interface KraljicWeights {
  supplyRisk: {
    supplierConcentration: number;
    switchingCost: number;
    leadTimeVariability: number;
    geographicExposure: number;
  };
  profitImpact: {
    shareOfSpend: number;
    effectOnProductCost: number;
    revenueCriticality: number;
  };
}

export const DEFAULT_WEIGHTS: KraljicWeights = {
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

export type KraljicQuadrant = 'Strategic' | 'Leverage' | 'Bottleneck' | 'Non-critical';

export interface KraljicScore {
  materialId: string;
  supplyRiskScore: number;
  profitImpactScore: number;
  quadrant: KraljicQuadrant;
  strategy: string;
  breakdown: {
    supplyRisk: any;
    profitImpact: any;
  }
}

export function score_kraljic(materials: any[], weights: KraljicWeights = DEFAULT_WEIGHTS, cutoffs = { risk: 50, profit: 50 }): KraljicScore[] {
  // We need to normalize some fields across all materials to score them 0-100
  const maxSwitchingCost = Math.max(...materials.map(m => m.switching_cost));
  
  return materials.map(m => {
    // Supply Risk factors (0-100)
    // supplierConcentration: 1 supplier = 100, 2 = 80, 5 = 40, >10 = 10
    const concentrationScore = m.supplier_count === 1 ? 100 : Math.max(10, 100 - (m.supplier_count - 1) * 10);
    const switchingScore = (m.switching_cost / (maxSwitchingCost || 1)) * 100;
    const ltvScore = Math.min(100, m.lead_time_variability * 100);
    const geoScore = m.geographic_exposure * 100;

    const supplyRiskScore = 
      (concentrationScore * weights.supplyRisk.supplierConcentration) +
      (switchingScore * weights.supplyRisk.switchingCost) +
      (ltvScore * weights.supplyRisk.leadTimeVariability) +
      (geoScore * weights.supplyRisk.geographicExposure);

    // Profit Impact factors (0-100)
    const spendScore = m.share_of_spend * 100; // already 0-1, but wait, share is usually small.
    // actually, let's just use effect_on_product_cost * 100 and revenue_criticality * 100
    // for share of spend, let's normalize by max share to spread it
    const maxShare = Math.max(...materials.map(x => x.share_of_spend));
    const normSpendScore = (m.share_of_spend / (maxShare || 1)) * 100;
    
    const effectScore = m.effect_on_product_cost * 100;
    const revenueScore = m.revenue_criticality * 100;

    const profitImpactScore = 
      (normSpendScore * weights.profitImpact.shareOfSpend) +
      (effectScore * weights.profitImpact.effectOnProductCost) +
      (revenueScore * weights.profitImpact.revenueCriticality);

    let quadrant: KraljicQuadrant;
    let strategy: string;

    if (supplyRiskScore >= cutoffs.risk && profitImpactScore >= cutoffs.profit) {
      quadrant = 'Strategic';
      strategy = 'Partnership and long-term contracts';
    } else if (supplyRiskScore < cutoffs.risk && profitImpactScore >= cutoffs.profit) {
      quadrant = 'Leverage';
      strategy = 'Competitive bidding and volume consolidation';
    } else if (supplyRiskScore >= cutoffs.risk && profitImpactScore < cutoffs.profit) {
      quadrant = 'Bottleneck';
      strategy = 'Secure supply, buffer stock, qualify substitutes';
    } else {
      quadrant = 'Non-critical';
      strategy = 'Simplify, automate, catalogue buying';
    }

    return {
      materialId: m.id,
      supplyRiskScore,
      profitImpactScore,
      quadrant,
      strategy,
      breakdown: {
        supplyRisk: { concentrationScore, switchingScore, ltvScore, geoScore },
        profitImpact: { normSpendScore, effectScore, revenueScore }
      }
    };
  });
}
