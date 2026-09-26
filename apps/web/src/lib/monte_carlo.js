"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mulberry32 = mulberry32;
exports.normalRandom = normalRandom;
exports.lognormalRandom = lognormalRandom;
exports.poissonRandom = poissonRandom;
exports.runMonteCarloSync = runMonteCarloSync;
function mulberry32(a) {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
// Box-Muller for Normal distribution
function normalRandom(rand, mean, stdDev) {
    var u = 0, v = 0;
    while (u === 0)
        u = rand();
    while (v === 0)
        v = rand();
    var z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdDev + mean;
}
// Lognormal
function lognormalRandom(rand, mu, sigma) {
    return Math.exp(normalRandom(rand, mu, sigma));
}
// Poisson via Knuth (good for small lambda) or Normal approx for large lambda
function poissonRandom(rand, lambda) {
    if (lambda > 30)
        return Math.max(0, Math.round(normalRandom(rand, lambda, Math.sqrt(lambda))));
    var L = Math.exp(-lambda);
    var k = 0;
    var p = 1;
    do {
        k++;
        p *= rand();
    } while (p > L);
    return k - 1;
}
function runMonteCarloSync(params) {
    var rand = mulberry32(params.seed);
    // Calculate Lognormal mu and sigma from mean/std of lognormal itself
    // If X is Lognormal, var = (exp(sigma^2)-1)*exp(2*mu + sigma^2)
    // mean = exp(mu + sigma^2 / 2)
    var calculateLognormalParams = function (m, v) {
        if (v === 0)
            return { mu: Math.log(m || 1), sigma: 0 }; // fallback
        var sigma2 = Math.log(1 + (v * v) / (m * m));
        var mu = Math.log(m) - sigma2 / 2;
        return { mu: mu, sigma: Math.sqrt(sigma2) };
    };
    var ltParams = calculateLognormalParams(params.laneLeadTimeMean, params.laneLeadTimeStd);
    var monParams = calculateLognormalParams(params.monsoonDelayMean, params.monsoonDelayStd);
    var supParams = calculateLognormalParams(params.supplierFailDelayMean, params.supplierFailDelayStd);
    var whParams = calculateLognormalParams(params.whOutageDelayMean, params.whOutageDelayStd);
    var leadTimes = new Float64Array(params.iterations);
    var shortages = new Float64Array(params.iterations);
    var totalCosts = new Float64Array(params.iterations);
    var stockoutCount = 0;
    var onTimeCount = 0; // "on time" defined as <= laneLeadTimeMean + 1
    var targetTime = params.laneLeadTimeMean;
    var convergenceData = [];
    var sumLT = 0;
    var sumCost = 0;
    for (var i = 0; i < params.iterations; i++) {
        // 1. Base Lead time
        var lt = (ltParams.sigma === 0) ? params.laneLeadTimeMean : lognormalRandom(rand, ltParams.mu, ltParams.sigma);
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
        if (lt <= targetTime)
            onTimeCount++;
        // 3. Demand during lead time
        var demand = 0;
        if (params.demandType === 'poisson') {
            demand = poissonRandom(rand, params.demandMean * (lt / Math.max(1, params.laneLeadTimeMean)));
        }
        else {
            // normal approximation scaling variance by time
            var scale = lt / Math.max(1, params.laneLeadTimeMean);
            var dMean = params.demandMean * scale;
            var dStd = (params.demandStd || 0) * Math.sqrt(scale);
            demand = Math.max(0, normalRandom(rand, dMean, dStd));
        }
        // 4. Shortage calculation
        var stockAvailable = params.demandMean + params.safetyStock; // assuming starting pos is mean demand + SS
        var shortage = Math.max(0, demand - stockAvailable);
        shortages[i] = shortage;
        if (shortage > 0)
            stockoutCount++;
        var cost = shortage * params.shortageCostPerUnit;
        totalCosts[i] = cost;
        sumCost += cost;
        if (i > 0 && i % 1000 === 0) {
            convergenceData.push({ iter: i, mean: sumCost / i, p90: 0 }); // p90 computed later
        }
    }
    // Sort for percentiles
    leadTimes.sort();
    totalCosts.sort();
    var getPercentile = function (arr, p) {
        var idx = Math.floor(p * arr.length);
        return arr[Math.min(idx, arr.length - 1)];
    };
    var p50 = getPercentile(leadTimes, 0.5);
    var p90 = getPercentile(leadTimes, 0.9);
    var p95 = getPercentile(leadTimes, 0.95);
    var expectedShortageCost = sumCost / params.iterations;
    var onTimeProb = onTimeCount / params.iterations;
    var stockoutProb = stockoutCount / params.iterations;
    // CVaR 95% = average of worst 5% costs
    var cvarStartIdx = Math.floor(0.95 * totalCosts.length);
    var cvarSum = 0;
    var cvarCount = 0;
    for (var i = cvarStartIdx; i < totalCosts.length; i++) {
        cvarSum += totalCosts[i];
        cvarCount++;
    }
    var cvar95 = cvarCount > 0 ? cvarSum / cvarCount : 0;
    // Populate p90 in convergence
    for (var _i = 0, convergenceData_1 = convergenceData; _i < convergenceData_1.length; _i++) {
        var c = convergenceData_1[_i];
        c.p90 = p90; // For simplicity in this sync return, we just fill the final p90
    }
    // Downsample leadTimes for histogram
    var hist = [];
    var step = Math.max(1, Math.floor(params.iterations / 100));
    for (var i = 0; i < params.iterations; i += step)
        hist.push(leadTimes[i]);
    return {
        p50: p50,
        p90: p90,
        p95: p95,
        onTimeProb: onTimeProb,
        stockoutProb: stockoutProb,
        expectedShortageCost: expectedShortageCost,
        cvar95: cvar95,
        totalCostMean: expectedShortageCost,
        convergenceData: convergenceData,
        histLeadTime: hist
    };
}
