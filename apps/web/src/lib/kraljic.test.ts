import { describe, it, expect } from 'vitest';
import { score_kraljic, DEFAULT_WEIGHTS } from './kraljic';

describe('Kraljic Scoring', () => {
  it('correctly scores and assigns quadrants for hand-computed known cases', () => {
    const materials = [
      {
        id: 'MAT-BOTTLENECK',
        supplier_count: 1, // 100
        switching_cost: 1000, // 1000/1000 = 100
        lead_time_variability: 0.8, // 80
        geographic_exposure: 0.9, // 90
        share_of_spend: 0.05, // 0.05/0.8 = 6.25%
        effect_on_product_cost: 0.2, // 20
        revenue_criticality: 0.2 // 20
      },
      {
        id: 'MAT-LEVERAGE',
        supplier_count: 10, // 10
        switching_cost: 100, // 10
        lead_time_variability: 0.1, // 10
        geographic_exposure: 0.1, // 10
        share_of_spend: 0.8, // 100
        effect_on_product_cost: 0.8, // 80
        revenue_criticality: 0.8 // 80
      }
    ];

    const scores = score_kraljic(materials, DEFAULT_WEIGHTS, { risk: 50, profit: 50 });
    
    // Check BOTTLENECK
    const bot = scores.find(s => s.materialId === 'MAT-BOTTLENECK')!;
    // SR: (100 * 0.4) + (100 * 0.2) + (80 * 0.2) + (90 * 0.2) = 40 + 20 + 16 + 18 = 94
    expect(bot.supplyRiskScore).toBeCloseTo(94);
    // PI: (6.25 * 0.5) + (20 * 0.3) + (20 * 0.2) = 3.125 + 6 + 4 = 13.125
    expect(bot.profitImpactScore).toBeCloseTo(13.125);
    expect(bot.quadrant).toBe('Bottleneck');

    // Check LEVERAGE
    const lev = scores.find(s => s.materialId === 'MAT-LEVERAGE')!;
    // SR: (10 * 0.4) + (10 * 0.2) + (10 * 0.2) + (10 * 0.2) = 4 + 2 + 2 + 2 = 10
    expect(lev.supplyRiskScore).toBeCloseTo(10);
    // PI: (100 * 0.5) + (80 * 0.3) + (80 * 0.2) = 50 + 24 + 16 = 90
    expect(lev.profitImpactScore).toBeCloseTo(90);
    expect(lev.quadrant).toBe('Leverage');
  });

  it('weight normalization works properly (changing weights changes outcome)', () => {
    const materials = [{
        id: 'MAT-1',
        supplier_count: 1, switching_cost: 1000, lead_time_variability: 0.8, geographic_exposure: 0.9,
        share_of_spend: 0.05, effect_on_product_cost: 0.2, revenue_criticality: 0.2
    }];
    const weights1 = { ...DEFAULT_WEIGHTS };
    const score1 = score_kraljic(materials, weights1)[0];
    
    const weights2 = { 
      supplyRisk: { supplierConcentration: 0.1, switchingCost: 0.1, leadTimeVariability: 0.1, geographicExposure: 0.7 },
      profitImpact: { shareOfSpend: 0.1, effectOnProductCost: 0.1, revenueCriticality: 0.8 }
    };
    const score2 = score_kraljic(materials, weights2)[0];

    expect(score1.supplyRiskScore).not.toBeCloseTo(score2.supplyRiskScore);
  });
});

describe('Kraljic Boundaries', () => {
  it('exercises a synthetic material EXACTLY at the 50/50 boundary', () => {
    // We will spoof max variables to 1 so the raw input maps 1:1 to the 0-100 scale.
    // If supplier_count is say 6 (so 100 - (6-1)*10 = 50 score)
    const boundaryMaterials = [{
      id: 'MAT-BOUNDARY',
      supplier_count: 6, // -> 50 score
      switching_cost: 0.5, // 50 (if max is 1)
      lead_time_variability: 0.5, // 50
      geographic_exposure: 0.5, // 50
      share_of_spend: 0.5, // 50 (if max is 1)
      effect_on_product_cost: 0.5, // 50
      revenue_criticality: 0.5 // 50
    }, {
      id: 'MAT-MAX', // Just to set maxes to 1
      supplier_count: 1, switching_cost: 1, lead_time_variability: 1, geographic_exposure: 1,
      share_of_spend: 1, effect_on_product_cost: 1, revenue_criticality: 1
    }];

    const scores = score_kraljic(boundaryMaterials, DEFAULT_WEIGHTS, { risk: 50, profit: 50 });
    const b = scores.find(s => s.materialId === 'MAT-BOUNDARY')!;
    
    // Weighted components:
    // Supply Risk: (50*0.4) + (50*0.2) + (50*0.2) + (50*0.2) = 50
    // Profit Impact: (50*0.5) + (50*0.3) + (50*0.2) = 50
    expect(b.supplyRiskScore).toBe(50);
    expect(b.profitImpactScore).toBe(50);
    // At exactly >= 50 and >= 50, it falls into Strategic
    expect(b.quadrant).toBe('Strategic');
  });
});
