"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

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
  const targetTime = params.slaDays || params.laneLeadTimeMean;
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

// run_mc2.ts
var fs = __toESM(require("fs"));
var net = JSON.parse(fs.readFileSync("../../data/network.json", "utf8"));
var lanePunRai = net.lanes.find((l) => l.source_id === "WH-PUN" && l.dest_id === "DIST-RAI");
var laneNagRai = net.lanes.find((l) => l.source_id === "WH-NAG" && l.dest_id === "DIST-RAI");
var paramsNagpur = {
  iterations: 1e4,
  seed: 42,
  laneLeadTimeMean: laneNagRai.actual_transit_mean / 24,
  // days
  laneLeadTimeStd: laneNagRai.actual_transit_std / 24,
  demandMean: 100,
  demandType: "normal",
  demandStd: 20,
  monsoonProb: laneNagRai.monsoon_vulnerable ? 0.1 : 0,
  monsoonDelayMean: 1,
  monsoonDelayStd: 0.5,
  supplierFailProb: 0.05,
  supplierFailDelayMean: 2,
  supplierFailDelayStd: 1,
  whOutageProb: 0.02,
  whOutageDelayMean: 0.5,
  whOutageDelayStd: 0.2,
  safetyStock: 50,
  shortageCostPerUnit: 100,
  slaDays: 85 / 24
  // Common SLA of 85 hours for fair comparison
};
var paramsPune = {
  ...paramsNagpur,
  laneLeadTimeMean: lanePunRai.actual_transit_mean / 24,
  // days
  laneLeadTimeStd: lanePunRai.actual_transit_std / 24,
  monsoonProb: lanePunRai.monsoon_vulnerable ? 0.1 : 0
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
console.log(`Fitting Method: Method of Moments (matching empirical mean/std to Lognormal expected values)`);
console.log(`Pune->Raipur (Source: WH-PUN->DIST-RAI, Field: actual_transit_mean=${lanePunRai.actual_transit_mean}h)`);
console.log(`Lognormal Fitted Params: mu=${punP.mu.toFixed(4)}, sigma=${punP.sigma.toFixed(4)}`);
console.log(`Nagpur->Raipur (Source: WH-NAG->DIST-RAI, Field: actual_transit_mean=${laneNagRai.actual_transit_mean}h)`);
console.log(`Lognormal Fitted Params: mu=${nagP.mu.toFixed(4)}, sigma=${nagP.sigma.toFixed(4)}`);
console.log("\n--- Pune -> Raipur (Baseline) ---");
console.log(`P50: ${pun.p50.toFixed(2)}d | P90: ${pun.p90.toFixed(2)}d | P95: ${pun.p95.toFixed(2)}d`);
console.log(`On-Time Prob (SLA 85h): ${(pun.onTimeProb * 100).toFixed(1)}%`);
console.log("\n--- Nagpur -> Raipur (Optimized Hub) ---");
console.log(`P50: ${nag.p50.toFixed(2)}d | P90: ${nag.p90.toFixed(2)}d | P95: ${nag.p95.toFixed(2)}d`);
console.log(`On-Time Prob (SLA 85h): ${(nag.onTimeProb * 100).toFixed(1)}%`);
