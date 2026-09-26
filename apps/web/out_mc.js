"use strict";

// src/lib/monte_carlo.ts
function mulberry32(a) {
  return function() {
    let t = a += 1831565813;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function normalRandom(rand, mean, stdDev) {
  let u = 0, v = 0;
  while (u === 0)
    u = rand();
  while (v === 0)
    v = rand();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return z * stdDev + mean;
}
function lognormalRandom(rand, mu, sigma) {
  return Math.exp(normalRandom(rand, mu, sigma));
}
function poissonRandom(rand, lambda) {
  if (lambda > 30)
    return Math.max(0, Math.round(normalRandom(rand, lambda, Math.sqrt(lambda))));
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > L);
  return k - 1;
}
function runMonteCarloSync(params) {
  const rand = mulberry32(params.seed);
  const calculateLognormalParams = (m, v) => {
    if (v === 0)
      return { mu: Math.log(m || 1), sigma: 0 };
    const sigma2 = Math.log(1 + v * v / (m * m));
    const mu = Math.log(m) - sigma2 / 2;
    return { mu, sigma: Math.sqrt(sigma2) };
  };
  const ltParams = calculateLognormalParams(params.laneLeadTimeMean, params.laneLeadTimeStd);
  const monParams = calculateLognormalParams(params.monsoonDelayMean, params.monsoonDelayStd);
  const supParams = calculateLognormalParams(params.supplierFailDelayMean, params.supplierFailDelayStd);
  const whParams = calculateLognormalParams(params.whOutageDelayMean, params.whOutageDelayStd);
  let leadTimes = new Float64Array(params.iterations);
  let shortages = new Float64Array(params.iterations);
  let totalCosts = new Float64Array(params.iterations);
  let stockoutCount = 0;
  let onTimeCount = 0;
  const targetTime = params.laneLeadTimeMean;
  const convergenceData = [];
  let sumLT = 0;
  let sumCost = 0;
  for (let i = 0; i < params.iterations; i++) {
    let lt = ltParams.sigma === 0 ? params.laneLeadTimeMean : lognormalRandom(rand, ltParams.mu, ltParams.sigma);
    if (rand() < params.monsoonProb) {
      lt += monParams.sigma === 0 ? params.monsoonDelayMean : lognormalRandom(rand, monParams.mu, monParams.sigma);
    }
    if (rand() < params.supplierFailProb) {
      lt += supParams.sigma === 0 ? params.supplierFailDelayMean : lognormalRandom(rand, supParams.mu, supParams.sigma);
    }
    if (rand() < params.whOutageProb) {
      lt += whParams.sigma === 0 ? params.whOutageDelayMean : lognormalRandom(rand, whParams.mu, whParams.sigma);
    }
    leadTimes[i] = lt;
    sumLT += lt;
    if (lt <= targetTime)
      onTimeCount++;
    let demand = 0;
    if (params.demandType === "poisson") {
      demand = poissonRandom(rand, params.demandMean * (lt / Math.max(1, params.laneLeadTimeMean)));
    } else {
      const scale = lt / Math.max(1, params.laneLeadTimeMean);
      const dMean = params.demandMean * scale;
      const dStd = (params.demandStd || 0) * Math.sqrt(scale);
      demand = Math.max(0, normalRandom(rand, dMean, dStd));
    }
    const stockAvailable = params.demandMean + params.safetyStock;
    const shortage = Math.max(0, demand - stockAvailable);
    shortages[i] = shortage;
    if (shortage > 0)
      stockoutCount++;
    const cost = shortage * params.shortageCostPerUnit;
    totalCosts[i] = cost;
    sumCost += cost;
    if (i > 0 && i % 1e3 === 0) {
      convergenceData.push({ iter: i, mean: sumCost / i, p90: 0 });
    }
  }
  leadTimes.sort();
  totalCosts.sort();
  const getPercentile = (arr, p) => {
    const idx = Math.floor(p * arr.length);
    return arr[Math.min(idx, arr.length - 1)];
  };
  const p50 = getPercentile(leadTimes, 0.5);
  const p90 = getPercentile(leadTimes, 0.9);
  const p95 = getPercentile(leadTimes, 0.95);
  const expectedShortageCost = sumCost / params.iterations;
  const onTimeProb = onTimeCount / params.iterations;
  const stockoutProb = stockoutCount / params.iterations;
  const cvarStartIdx = Math.floor(0.95 * totalCosts.length);
  let cvarSum = 0;
  let cvarCount = 0;
  for (let i = cvarStartIdx; i < totalCosts.length; i++) {
    cvarSum += totalCosts[i];
    cvarCount++;
  }
  const cvar95 = cvarCount > 0 ? cvarSum / cvarCount : 0;
  for (let c of convergenceData) {
    c.p90 = p90;
  }
  const hist = [];
  const step = Math.max(1, Math.floor(params.iterations / 100));
  for (let i = 0; i < params.iterations; i += step)
    hist.push(leadTimes[i]);
  return {
    p50,
    p90,
    p95,
    onTimeProb,
    stockoutProb,
    expectedShortageCost,
    cvar95,
    totalCostMean: expectedShortageCost,
    convergenceData,
    histLeadTime: hist
  };
}

// run_mc.ts
var paramsNagpur = {
  iterations: 1e4,
  seed: 42,
  laneLeadTimeMean: 0.5,
  // 12 hours
  laneLeadTimeStd: 0.1,
  demandMean: 100,
  demandType: "normal",
  demandStd: 20,
  monsoonProb: 0.1,
  monsoonDelayMean: 1,
  monsoonDelayStd: 0.5,
  supplierFailProb: 0.05,
  supplierFailDelayMean: 2,
  supplierFailDelayStd: 1,
  whOutageProb: 0.02,
  whOutageDelayMean: 0.5,
  whOutageDelayStd: 0.2,
  safetyStock: 50,
  shortageCostPerUnit: 100
};
var paramsPune = {
  ...paramsNagpur,
  laneLeadTimeMean: 2,
  // 48 hours
  laneLeadTimeStd: 0.5
};
var nag = runMonteCarloSync(paramsNagpur);
var pun = runMonteCarloSync(paramsPune);
var calcLogParams = (m, v) => {
  const sigma2 = Math.log(1 + v * v / (m * m));
  const mu = Math.log(m) - sigma2 / 2;
  return { mu, sigma: Math.sqrt(sigma2) };
};
var punP = calcLogParams(paramsPune.laneLeadTimeMean, paramsPune.laneLeadTimeStd);
var nagP = calcLogParams(paramsNagpur.laneLeadTimeMean, paramsNagpur.laneLeadTimeStd);
console.log("\n=== MONTE CARLO (COMMON RANDOM NUMBERS SEED=42) ===");
console.log(`Pune->Raipur Lognormal Fitted Params: mu=${punP.mu.toFixed(4)}, sigma=${punP.sigma.toFixed(4)}`);
console.log(`Nagpur->Raipur Lognormal Fitted Params: mu=${nagP.mu.toFixed(4)}, sigma=${nagP.sigma.toFixed(4)}`);
console.log("\n--- Pune -> Raipur (Baseline) ---");
console.log(`P50: ${pun.p50.toFixed(2)}d | P90: ${pun.p90.toFixed(2)}d | P95: ${pun.p95.toFixed(2)}d`);
var punOnTime = pun.histLeadTime.filter((d) => d <= 3).length / 1e4;
console.log(`On-Time Prob (SLA 3d): ${(punOnTime * 100).toFixed(1)}%`);
console.log("\n--- Nagpur -> Raipur (Optimized Hub) ---");
console.log(`P50: ${nag.p50.toFixed(2)}d | P90: ${nag.p90.toFixed(2)}d | P95: ${nag.p95.toFixed(2)}d`);
var nagOnTime = nag.histLeadTime.filter((d) => d <= 3).length / 1e4;
console.log(`On-Time Prob (SLA 3d): ${(nagOnTime * 100).toFixed(1)}%`);
