import { describe, it, expect } from 'vitest';
import { useGovernanceStore } from './governanceStore';

describe('Governance Queue Logic', () => {
  it('handles enqueue and unauth/auth commits', () => {
    const store = useGovernanceStore.getState();
    
    // Reset state
    useGovernanceStore.setState({ queue: [], auditLog: [], currentRole: 'AI Agent' });
    
    // AI recommends changing truck class mix
    let res = useGovernanceStore.getState().enqueue('change truck class mix', 'Optimizer', { mix: 'all-icv' });
    expect(res.success).toBe(true);
    
    let queue = useGovernanceStore.getState().queue;
    expect(queue).toHaveLength(1);
    expect(queue[0].status).toBe('pending');
    expect(queue[0].required_approver).toBe('Logistics Head'); // From DEFAULT_RACI
    
    // AI tries to commit it
    res = useGovernanceStore.getState().processQueueItem(queue[0].id, 'approve');
    expect(res.success).toBe(false);
    expect(res.reason).toContain('never allowed to commit');
    
    // Switch to Logistics Head
    useGovernanceStore.setState({ currentRole: 'Logistics Head' });
    
    // Let's pass a mock commit callback
    let sideEffectRan = false;
    res = useGovernanceStore.getState().processQueueItem(queue[0].id, 'approve', () => { sideEffectRan = true; });
    expect(res.success).toBe(true);
    expect(sideEffectRan).toBe(true);
    
    queue = useGovernanceStore.getState().queue;
    expect(queue[0].status).toBe('approved');
    
    // Check audit log
    const audit = useGovernanceStore.getState().auditLog;
    expect(audit.length).toBeGreaterThanOrEqual(3);
    const unauthLog = audit.find(a => a.action === 'unauthorized_commit_attempt');
    expect(unauthLog).toBeDefined();
    
    const approveLog = audit.find(a => a.action === 'commit_approved');
    expect(approveLog).toBeDefined();
  });
});
