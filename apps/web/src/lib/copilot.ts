import { runMonteCarloSync } from './monte_carlo';
import { check_raci_permission, DEFAULT_RACI } from './governance';
import { classify_abc_xyz, compute_inventory_policy } from './inventory';
import { score_kraljic, DEFAULT_WEIGHTS } from './kraljic';

export type StepLog = { step: string; tool: string; input: any; output: any };

// Orion Tool Registry
export const OrionTools = {
    // Network Tools
    getNetworkNode: (data: any, id: string) => {
        return (data.warehouses || []).find((w:any) => w.id === id) || 
               (data.distributors || []).find((d:any) => d.id === id) ||
               (data.plants || []).find((p:any) => p.id === id);
    },
    getLanePerformance: (data: any, source: string, dest: string) => {
        return data.lanes.find((l:any) => l.source_id === source && l.dest_id === dest);
    },
    
    // Inventory Tools
    classifyABCXYZ: (skus: any[], history: any[], config: any) => {
        return classify_abc_xyz(skus, history, config).outputs;
    },
    computeInventoryPolicy: (sku: any, abcClass: string, mean: number, std: number, lt: number, ltStd: number, params: any) => {
        return compute_inventory_policy(sku, abcClass, mean, std, lt, ltStd, params, 0.95).outputs;
    },

    // Risk & Vendor Tools
    runMonteCarlo: (params: any) => {
        return runMonteCarloSync(params);
    },
    scoreKraljic: (materials: any[]) => {
        return score_kraljic(materials, DEFAULT_WEIGHTS);
    },

    // Governance Tools
    checkRACI: (decision: string, role: string, action: 'draft'|'commit') => {
        return check_raci_permission(DEFAULT_RACI, role as any, decision as any, action as any);
    }
};

export function runRaipurScenario(networkData: any): { logs: StepLog[], planCard: any } {
  const logs: StepLog[] = [];
  
  // 1. getLanePerformance
  const baselineLane = OrionTools.getLanePerformance(networkData, 'WH-PUN', 'DIST-RAI');
  logs.push({
    step: 'Identify delayed lane', tool: 'getLanePerformance',
    input: { source: 'WH-PUN', dest: 'DIST-RAI' },
    output: { actual_h: baselineLane?.actual_transit_mean, variance_h: baselineLane ? baselineLane.actual_transit_mean - baselineLane.planned_transit_hours : 0 }
  });

  // 2. find_alternate (Mock wrapper for simplicity)
  const altLane = OrionTools.getLanePerformance(networkData, 'WH-NAG', 'DIST-RAI');
  logs.push({
    step: 'Find alternate fulfillment node', tool: 'getLanePerformance',
    input: { source: 'WH-NAG', dest: 'DIST-RAI' },
    output: { actual_h: altLane?.actual_transit_mean, monsoon_risk: altLane?.monsoon_vulnerable }
  });

  // 3. runMonteCarlo
  if (!baselineLane || !altLane) throw new Error("Lane data missing");
  const paramsPun = {
    iterations: 1000, seed: 42,
    laneLeadTimeMean: baselineLane.actual_transit_mean / 24, laneLeadTimeStd: baselineLane.actual_transit_std / 24,
    demandMean: 100, demandType: 'normal' as const, demandStd: 20,
    monsoonProb: baselineLane.monsoon_vulnerable ? 0.1 : 0.0, monsoonDelayMean: 1.0, monsoonDelayStd: 0.5,
    supplierFailProb: 0.05, supplierFailDelayMean: 2.0, supplierFailDelayStd: 1.0,
    whOutageProb: 0.02, whOutageDelayMean: 0.5, whOutageDelayStd: 0.2,
    safetyStock: 50, shortageCostPerUnit: 100, slaDays: 85 / 24.0
  };
  const punMC = OrionTools.runMonteCarlo(paramsPun);
  const nagMC = OrionTools.runMonteCarlo({ ...paramsPun, laneLeadTimeMean: altLane.actual_transit_mean / 24, laneLeadTimeStd: altLane.actual_transit_std / 24, monsoonProb: altLane.monsoon_vulnerable ? 0.1 : 0.0 });

  logs.push({
    step: 'Simulate risk for Pune vs Nagpur', tool: 'runMonteCarlo',
    input: { baseline: 'WH-PUN', alternate: 'WH-NAG' },
    output: { pun_p95: punMC.p95.toFixed(2), nag_p95: nagMC.p95.toFixed(2) }
  });

  // 4. checkRACI
  const permission = OrionTools.checkRACI('shift a distributor cluster', 'AI Agent', 'commit');
  logs.push({
    step: 'Check approval permissions', tool: 'checkRACI',
    input: { decision: 'shift a distributor cluster', role: 'AI Agent' },
    output: { allowed: permission.allowed, required_approver: permission.required_approver }
  });

  const planCard = {
    title: 'Resolution: Shift Chhattisgarh Fulfillment',
    trigger: 'Delivery delay anomaly detected on WH-PUN -> DIST-RAI',
    action: 'Re-allocate DIST-RAI to WH-NAG',
    before_kpis: { leadTimeP95: punMC.p95.toFixed(2) + 'd', onTime: (punMC.onTimeProb * 100).toFixed(1) + '%' },
    after_kpis: { leadTimeP95: nagMC.p95.toFixed(2) + 'd', onTime: (nagMC.onTimeProb * 100).toFixed(1) + '%' },
    requiredApprover: permission.required_approver
  };

  return { logs, planCard };
}
