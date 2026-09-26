import { create } from 'zustand';
import { RACIRole, RACIDecision, RACIMatrix, DEFAULT_RACI, check_raci_permission } from './governance';

export type QueueStatus = 'pending' | 'approved' | 'rejected' | 'modified';

export interface QueueItem {
  id: string;
  decision: RACIDecision;
  originating_app: string;
  payload: any;
  before_kpis?: any;
  after_kpis?: any;
  required_approver?: RACIRole;
  status: QueueStatus;
  timestamp: number;
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  actor: RACIRole;
  action: string;
  details: string;
}

interface GovernanceState {
  matrix: RACIMatrix;
  currentRole: RACIRole;
  queue: QueueItem[];
  auditLog: AuditEntry[];
  
  setMatrix: (matrix: RACIMatrix) => void;
  setCurrentRole: (role: RACIRole) => void;
  enqueue: (decision: RACIDecision, originating_app: string, payload: any, before_kpis?: any, after_kpis?: any) => { success: boolean, reason?: string };
  processQueueItem: (id: string, action: 'approve' | 'reject' | 'modify', commitCallback?: () => void) => { success: boolean, reason: string };
}

export const useGovernanceStore = create<GovernanceState>((set, get) => ({
  matrix: JSON.parse(JSON.stringify(DEFAULT_RACI)),
  currentRole: 'Supply Chain Director',
  queue: [
    {
      id: 'SAMPLE-1',
      decision: 'change safety-stock policy',
      originating_app: 'Inventory Lab',
      payload: { sku: 'SKU-042', node: 'WH-PUN', new_ss: 1500 },
      before_kpis: { stockout_risk: '12%', holding_cost: 4500 },
      after_kpis: { stockout_risk: '2%', holding_cost: 6200 },
      required_approver: 'Supply Chain Director',
      status: 'pending',
      timestamp: Date.now() - 3600000
    },
    {
      id: 'SAMPLE-2',
      decision: 'shift a distributor cluster',
      originating_app: 'Orion Orchestrator',
      payload: { from: 'WH-PUN', to: 'WH-NAG', dist: 'DIST-RAI' },
      before_kpis: { leadTimeP95: '4.2d', cost: 55000 },
      after_kpis: { leadTimeP95: '2.1d', cost: 62000 },
      required_approver: 'Supply Chain Director',
      status: 'pending',
      timestamp: Date.now() - 1800000
    }
  ],
  auditLog: [
    { id: 'LOG-1', timestamp: Date.now() - 7200000, actor: 'AI Agent', action: 'enqueue', details: 'Enqueued change safety-stock policy from Inventory Lab (DEMO)' },
    { id: 'LOG-2', timestamp: Date.now() - 1800000, actor: 'AI Agent', action: 'enqueue', details: 'Enqueued shift a distributor cluster from Orion Orchestrator (DEMO)' }
  ],

  setMatrix: (matrix) => set({ matrix }),
  setCurrentRole: (role) => set({ currentRole: role }),

  enqueue: (decision, originating_app, payload, before_kpis, after_kpis) => {
    const state = get();
    // Usually enqueued by the AI Agent or another role "recommending" it.
    const perm = check_raci_permission(state.matrix, state.currentRole, decision, 'recommend');
    if (!perm.allowed) {
       // Log denial
       const denialId = Math.random().toString(36).substr(2, 9);
       set(s => ({
         auditLog: [...s.auditLog, { id: denialId, timestamp: Date.now(), actor: state.currentRole, action: 'enqueue_denied', details: `Denied enqueue of ${decision}: ${perm.reason}` }]
       }));
       return { success: false, reason: perm.reason };
    }

    const id = Math.random().toString(36).substr(2, 9);
    
    // Who needs to approve? The 'A'
    let required_approver: RACIRole | undefined;
    for (const [r, a] of Object.entries(state.matrix[decision])) {
      if (a === 'A') required_approver = r as RACIRole;
    }

    const item: QueueItem = {
      id,
      decision,
      originating_app,
      payload,
      before_kpis,
      after_kpis,
      required_approver,
      status: 'pending',
      timestamp: Date.now()
    };

    set(s => ({
      queue: [...s.queue, item],
      auditLog: [...s.auditLog, { id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), actor: state.currentRole, action: 'enqueue', details: `Enqueued ${decision} from ${originating_app}` }]
    }));
    return { success: true };
  },

  processQueueItem: (id, action, commitCallback) => {
    const state = get();
    const item = state.queue.find(q => q.id === id);
    if (!item) return { success: false, reason: 'Item not found' };

    if (item.status !== 'pending') return { success: false, reason: `Item already ${item.status}` };

    const perm = check_raci_permission(state.matrix, state.currentRole, item.decision, 'commit');
    if (!perm.allowed) {
       // Log unauthorized approval attempt
       set(s => ({
         auditLog: [...s.auditLog, { id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), actor: state.currentRole, action: 'unauthorized_commit_attempt', details: `Tried to ${action} ${item.decision}: ${perm.reason}` }]
       }));
       return { success: false, reason: perm.reason };
    }

    // Process it
    const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'modified';
    
    if (newStatus === 'approved' && commitCallback) {
        commitCallback(); // Actually execute the side effect
    }

    set(s => ({
      queue: s.queue.map(q => q.id === id ? { ...q, status: newStatus } : q),
      auditLog: [...s.auditLog, { id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), actor: state.currentRole, action: `commit_${newStatus}`, details: `${newStatus} ${item.decision} from ${item.originating_app}` }]
    }));

    return { success: true, reason: `Successfully ${newStatus}` };
  }
}));
