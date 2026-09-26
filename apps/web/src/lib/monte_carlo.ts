export function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Box-Muller for Normal distribution
export function normalRandom(rand: () => number, mean: number, stdDev: number) {
  let u = 0, v = 0;
  while(u === 0) u = rand();
  while(v === 0) v = rand();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdDev + mean;
}

// Lognormal
export function lognormalRandom(rand: () => number, mu: number, sigma: number) {
  return Math.exp(normalRandom(rand, mu, sigma));
}

// Poisson via Knuth (good for small lambda) or Normal approx for large lambda
export function poissonRandom(rand: () => number, lambda: number) {
  if (lambda > 30) return Math.max(0, Math.round(normalRandom(rand, lambda, Math.sqrt(lambda))));
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > L);
  return k - 1;
}

export interface SimParams {
  iterations: number;
  seed: number;
  laneLeadTimeMean: number;
  laneLeadTimeStd: number;
  demandMean: number;
  demandType: 'normal' | 'poisson';
  demandStd?: number; // if normal
  monsoonProb: number;
  monsoonDelayMean: number;
  monsoonDelayStd: number;
  supplierFailProb: number;
  supplierFailDelayMean: number;
  supplierFailDelayStd: number;
  whOutageProb: number;
  whOutageDelayMean: number;
  whOutageDelayStd: number;
  safetyStock: number;
  shortageCostPerUnit: number;
  slaDays?: number;
}

export interface SimResult {
  p50: number;
  p90: number;
  p95: number;
  onTimeProb: number;
  stockoutProb: number;
  expectedShortageCost: number;
  cvar95: number;
  totalCostMean: number;
  convergenceData: { iter: number, mean: number, p90: number }[];
  histLeadTime: number[];
  histCosts: number[];
}

export function runMonteCarloSync(params: SimParams): SimResult {
  const rand = mulberry32(params.seed);
  
  // Calculate Lognormal mu and sigma from mean/std of lognormal itself
  // If X is Lognormal, var = (exp(sigma^2)-1)*exp(2*mu + sigma^2)
  // mean = exp(mu + sigma^2 / 2)
  const calculateLognormalParams = (m: number, v: number) => {
    if (v === 0) return { mu: Math.log(m || 1), sigma: 0 }; // fallback
    const sigma2 = Math.log(1 + (v * v) / (m * m));
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
  let onTimeCount = 0; // "on time" defined as <= laneLeadTimeMean + 1
  const targetTime = params.slaDays || params.laneLeadTimeMean;

  const convergenceData = [];
  let sumLT = 0;
  let sumCost = 0;

  for (let i = 0; i < params.iterations; i++) {
    // 1. Base Lead time
    let lt = (ltParams.sigma === 0) ? params.laneLeadTimeMean : lognormalRandom(rand, ltParams.mu, ltParams.sigma);
    
    // 2. Disruptions
    if (rand() < params.monsoonProb) {
       lt += (monParams.sigma === 0) ? params.monsoonDelayMean : lognormalRandom(rand, monParams.mu, monParams.sigma);
    }
    if (rand() < params.supplierFailProb) {
       lt += (supParams.sigma === 0) ? params.supplierFailDelayMean : lognormalRandom(rand, supParams.mu, supParams.sigma);
    }
    if (rand() < params.whOutageProb) {
       lt += (whParams.sigma === 0) ? params.whOutageDelayMean : lognormalRandom(rand, whParams.mu, whParams.sigma);
    }

    leadTimes[i] = lt;
    sumLT += lt;

    if (lt <= targetTime) onTimeCount++;

    // 3. Demand during lead time
    let demand = 0;
    if (params.demandType === 'poisson') {
       demand = poissonRandom(rand, params.demandMean * (lt / Math.max(1, params.laneLeadTimeMean)));
    } else {
       // normal approximation scaling variance by time
       const scale = lt / Math.max(1, params.laneLeadTimeMean);
       const dMean = params.demandMean * scale;
       const dStd = (params.demandStd || 0) * Math.sqrt(scale);
       demand = Math.max(0, normalRandom(rand, dMean, dStd));
    }

    // 4. Shortage calculation
    const stockAvailable = params.demandMean + params.safetyStock; // assuming starting pos is mean demand + SS
    const shortage = Math.max(0, demand - stockAvailable);
    shortages[i] = shortage;
    if (shortage > 0) stockoutCount++;

    const cost = shortage * params.shortageCostPerUnit;
    totalCosts[i] = cost;
    sumCost += cost;

    if (i > 0 && i % 1000 === 0) {
      convergenceData.push({ iter: i, mean: sumCost / i, p90: 0 }); // p90 computed later
    }
  }

  // Sort for percentiles
  leadTimes.sort();
  totalCosts.sort();

  const getPercentile = (arr: Float64Array, p: number) => {
    const idx = Math.floor(p * arr.length);
    return arr[Math.min(idx, arr.length - 1)];
  };

  const p50 = getPercentile(leadTimes, 0.5);
  const p90 = getPercentile(leadTimes, 0.9);
  const p95 = getPercentile(leadTimes, 0.95);

  const expectedShortageCost = sumCost / params.iterations;
  const onTimeProb = onTimeCount / params.iterations;
  const stockoutProb = stockoutCount / params.iterations;

  // CVaR 95% = average of worst 5% costs
  const cvarStartIdx = Math.floor(0.95 * totalCosts.length);
  let cvarSum = 0;
  let cvarCount = 0;
  for (let i = cvarStartIdx; i < totalCosts.length; i++) {
    cvarSum += totalCosts[i];
    cvarCount++;
  }
  const cvar95 = cvarCount > 0 ? cvarSum / cvarCount : 0;

  // Populate p90 in convergence
  for (let c of convergenceData) {
    c.p90 = p90; // For simplicity in this sync return, we just fill the final p90
  }

  // Downsample leadTimes and totalCosts for histogram
  const hist = [];
  const histC = [];
  const step = Math.max(1, Math.floor(params.iterations / 100));
  for (let i = 0; i < params.iterations; i+=step) {
      hist.push(leadTimes[i]);
      histC.push(totalCosts[i]);
  }

  return {
    p50, p90, p95, onTimeProb, stockoutProb, expectedShortageCost, cvar95, totalCostMean: expectedShortageCost, convergenceData, histLeadTime: hist, histCosts: histC
  };
}
