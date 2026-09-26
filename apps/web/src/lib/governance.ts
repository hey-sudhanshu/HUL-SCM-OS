export type RACIRole = 'Demand Planner' | 'Inventory Planner' | 'Warehouse Manager' | 'Logistics Head' | 'Procurement Head' | 'Supply Chain Director' | 'AI Agent';
export type RACIAssignment = 'R' | 'A' | 'C' | 'I' | '';
export type RACIDecision = 'approve reorder' | 'change safety-stock policy' | 'shift a distributor cluster' | 'approve dispatch plan' | 'change truck class mix' | 'approve new hub' | 'change sourcing strategy' | 'approve a forecast override' | 'run a simulation' | 'generate a report' | 'adjust cost parameters' | 'approve emergency reroute' | 'close a risk' | 'approve supplier switch';

export type RACIMatrix = Record<RACIDecision, Record<RACIRole, RACIAssignment>>;

export const DEFAULT_RACI: RACIMatrix = {
  'approve reorder': { 'Demand Planner': '', 'Inventory Planner': 'R', 'Warehouse Manager': 'I', 'Logistics Head': '', 'Procurement Head': 'A', 'Supply Chain Director': 'I', 'AI Agent': 'C' },
  'change safety-stock policy': { 'Demand Planner': 'C', 'Inventory Planner': 'R', 'Warehouse Manager': 'I', 'Logistics Head': '', 'Procurement Head': '', 'Supply Chain Director': 'A', 'AI Agent': 'C' },
  'shift a distributor cluster': { 'Demand Planner': '', 'Inventory Planner': 'I', 'Warehouse Manager': 'R', 'Logistics Head': 'A', 'Procurement Head': '', 'Supply Chain Director': 'I', 'AI Agent': 'C' },
  'approve dispatch plan': { 'Demand Planner': '', 'Inventory Planner': '', 'Warehouse Manager': 'I', 'Logistics Head': 'R', 'Procurement Head': '', 'Supply Chain Director': 'A', 'AI Agent': 'C' },
  'change truck class mix': { 'Demand Planner': '', 'Inventory Planner': '', 'Warehouse Manager': 'C', 'Logistics Head': 'A', 'Procurement Head': '', 'Supply Chain Director': 'I', 'AI Agent': 'R' },
  'approve new hub': { 'Demand Planner': 'C', 'Inventory Planner': 'C', 'Warehouse Manager': 'C', 'Logistics Head': 'R', 'Procurement Head': 'I', 'Supply Chain Director': 'A', 'AI Agent': 'C' },
  'change sourcing strategy': { 'Demand Planner': 'I', 'Inventory Planner': 'I', 'Warehouse Manager': '', 'Logistics Head': '', 'Procurement Head': 'A', 'Supply Chain Director': 'R', 'AI Agent': 'C' },
  'approve a forecast override': { 'Demand Planner': 'R', 'Inventory Planner': 'I', 'Warehouse Manager': '', 'Logistics Head': '', 'Procurement Head': '', 'Supply Chain Director': 'A', 'AI Agent': 'C' },
  'run a simulation': { 'Demand Planner': 'I', 'Inventory Planner': 'I', 'Warehouse Manager': 'I', 'Logistics Head': 'I', 'Procurement Head': 'I', 'Supply Chain Director': 'A', 'AI Agent': 'R' },
  'generate a report': { 'Demand Planner': 'I', 'Inventory Planner': 'I', 'Warehouse Manager': 'I', 'Logistics Head': 'I', 'Procurement Head': 'I', 'Supply Chain Director': 'A', 'AI Agent': 'R' },
  'adjust cost parameters': { 'Demand Planner': '', 'Inventory Planner': '', 'Warehouse Manager': 'I', 'Logistics Head': 'R', 'Procurement Head': 'C', 'Supply Chain Director': 'A', 'AI Agent': 'C' },
  'approve emergency reroute': { 'Demand Planner': '', 'Inventory Planner': 'I', 'Warehouse Manager': 'C', 'Logistics Head': 'A', 'Procurement Head': '', 'Supply Chain Director': 'I', 'AI Agent': 'R' },
  'close a risk': { 'Demand Planner': 'I', 'Inventory Planner': 'I', 'Warehouse Manager': 'I', 'Logistics Head': 'I', 'Procurement Head': 'R', 'Supply Chain Director': 'A', 'AI Agent': 'C' },
  'approve supplier switch': { 'Demand Planner': '', 'Inventory Planner': 'C', 'Warehouse Manager': 'I', 'Logistics Head': 'I', 'Procurement Head': 'R', 'Supply Chain Director': 'A', 'AI Agent': 'C' },
};

export function validate_raci(matrix: RACIMatrix): { valid: boolean, errors: string[] } {
  const errors: string[] = [];
  for (const [decision, roles] of Object.entries(matrix)) {
    let aCount = 0;
    let rCount = 0;
    for (const [role, assignment] of Object.entries(roles)) {
      if (assignment === 'A') aCount++;
      if (assignment === 'R') rCount++;
      if (role === 'AI Agent' && assignment === 'A') {
        errors.push(`AI Agent cannot be A (Accountable) for ${decision}`);
      }
    }
    if (aCount !== 1) {
      errors.push(`${decision} must have exactly one A (has ${aCount})`);
    }
    if (rCount < 1) {
      errors.push(`${decision} must have at least one R (has ${rCount})`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export type RACIAction = 'recommend' | 'simulate' | 'commit';

export function check_raci_permission(matrix: RACIMatrix, role: RACIRole, decision: RACIDecision, action: RACIAction): { allowed: boolean, reason: string, required_approver?: RACIRole } {
  const assignment = matrix[decision][role];
  
  // AI Agent logic
  if (role === 'AI Agent') {
    if (action === 'commit') {
      return { allowed: false, reason: "AI Agent is never allowed to commit." };
    }
    if (assignment === 'R' || assignment === 'C') {
      return { allowed: true, reason: `AI Agent can ${action} as it is ${assignment}.` };
    }
    return { allowed: false, reason: `AI Agent is ${assignment || 'blank'} for ${decision}, cannot ${action}.` };
  }
  
  // Find who the 'A' is
  let aRole: RACIRole | undefined;
  for (const [r, a] of Object.entries(matrix[decision])) {
    if (a === 'A') aRole = r as RACIRole;
  }
  
  if (action === 'commit') {
    if (assignment === 'A') {
      return { allowed: true, reason: `Role is Accountable for ${decision}.` };
    }
    if (assignment === 'R') {
      return { allowed: true, reason: `Role is Responsible for ${decision}, assuming approval from A.`, required_approver: aRole };
    }
    return { allowed: false, reason: `Role is ${assignment || 'blank'}, cannot commit.`, required_approver: aRole };
  }
  
  if (action === 'recommend' || action === 'simulate') {
    if (assignment === 'A' || assignment === 'R' || assignment === 'C') {
      return { allowed: true, reason: `Role is ${assignment}, can ${action}.` };
    }
    return { allowed: false, reason: `Role is ${assignment || 'blank'}, cannot ${action}.` };
  }
  
  return { allowed: false, reason: "Unknown scenario" };
}
