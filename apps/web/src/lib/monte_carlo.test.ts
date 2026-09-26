import { describe, it, expect } from 'vitest';
import { runMonteCarloSync, SimParams } from './monte_carlo';

describe('Monte Carlo Simulator', () => {
  const baseParams: SimParams = {
    iterations: 10000,
    seed: 42,
    laneLeadTimeMean: 10,
    laneLeadTimeStd: 2,
    demandMean: 100,
    demandType: 'normal',
    demandStd: 20,
    monsoonProb: 0,
    monsoonDelayMean: 0,
    monsoonDelayStd: 0,
    supplierFailProb: 0,
    supplierFailDelayMean: 0,
    supplierFailDelayStd: 0,
    whOutageProb: 0,
    whOutageDelayMean: 0,
    whOutageDelayStd: 0,
    safetyStock: 30, // 100+30 = 130 stock
    shortageCostPerUnit: 50
  };

  it('Determinism: same seed gives same results', () => {
    const r1 = runMonteCarloSync(baseParams);
    const r2 = runMonteCarloSync(baseParams);
    expect(r1.p50).toBeCloseTo(r2.p50);
    expect(r1.p90).toBeCloseTo(r2.p90);
    expect(r1.expectedShortageCost).toBeCloseTo(r2.expectedShortageCost);
    
    const r3 = runMonteCarloSync({ ...baseParams, seed: 99 });
    expect(r1.p50).not.toBe(r3.p50);
  });

  it('Degenerate case: zero variance -> identical values', () => {
    const params = { ...baseParams, laneLeadTimeStd: 0, demandStd: 0, monsoonProb: 0 };
    const r = runMonteCarloSync(params);
    expect(r.p50).toBeCloseTo(10);
    expect(r.p90).toBeCloseTo(10);
    expect(r.p95).toBeCloseTo(10);
    expect(r.expectedShortageCost).toBe(0); // demand is 100, stock is 130
  });

  it('Monotonicity: increasing disruption probability increases expected cost', () => {
    const rBase = runMonteCarloSync(baseParams);
    const rDisrupt = runMonteCarloSync({
      ...baseParams,
      monsoonProb: 0.5,
      monsoonDelayMean: 5,
      monsoonDelayStd: 1
    });
    // With disruptions, lead time goes up, demand during LT goes up, shortage increases
    expect(rDisrupt.expectedShortageCost).toBeGreaterThan(rBase.expectedShortageCost);
    expect(rDisrupt.p90).toBeGreaterThan(rBase.p90);
  });
});
