import { describe, it, expect } from 'vitest';
import { validate_raci, check_raci_permission, DEFAULT_RACI, RACIMatrix, RACIDecision, RACIRole } from './governance';

describe('Governance RACI Logic', () => {
  it('validate_raci accepts the default matrix', () => {
    const res = validate_raci(DEFAULT_RACI);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('validate_raci rejects two A, zero A, no R, and AI Agent as sole A', () => {
    const badMatrix = JSON.parse(JSON.stringify(DEFAULT_RACI)) as RACIMatrix;
    // Two As
    badMatrix['approve reorder']['Logistics Head'] = 'A'; 
    // Zero A
    badMatrix['approve new hub']['Supply Chain Director'] = 'R';
    // No R
    badMatrix['approve dispatch plan']['Logistics Head'] = 'C';
    // AI Agent as sole A
    badMatrix['close a risk']['Supply Chain Director'] = 'I';
    badMatrix['close a risk']['AI Agent'] = 'A';

    const res = validate_raci(badMatrix);
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('approve reorder must have exactly one A (has 2)');
    expect(res.errors).toContain('approve new hub must have exactly one A (has 0)');
    expect(res.errors).toContain('approve dispatch plan must have at least one R (has 0)');
    expect(res.errors).toContain('AI Agent cannot be A (Accountable) for close a risk');
  });

  it('check_raci_permission handles human roles correctly', () => {
    // Inventory Planner is R for 'approve reorder', Procurement Head is A
    let res = check_raci_permission(DEFAULT_RACI, 'Inventory Planner', 'approve reorder', 'commit');
    expect(res.allowed).toBe(true); // Can commit with approval
    expect(res.required_approver).toBe('Procurement Head');

    res = check_raci_permission(DEFAULT_RACI, 'Procurement Head', 'approve reorder', 'commit');
    expect(res.allowed).toBe(true);
    expect(res.required_approver).toBeUndefined(); // Accountable

    res = check_raci_permission(DEFAULT_RACI, 'Warehouse Manager', 'approve reorder', 'commit');
    expect(res.allowed).toBe(false); // Only 'I'
  });

  it('check_raci_permission ALWAYS denies AI Agent commit', () => {
    // AI is R for 'change truck class mix'
    let res = check_raci_permission(DEFAULT_RACI, 'AI Agent', 'change truck class mix', 'commit');
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('never allowed to commit');

    res = check_raci_permission(DEFAULT_RACI, 'AI Agent', 'change truck class mix', 'recommend');
    expect(res.allowed).toBe(true);

    res = check_raci_permission(DEFAULT_RACI, 'AI Agent', 'change truck class mix', 'simulate');
    expect(res.allowed).toBe(true);
  });
});
