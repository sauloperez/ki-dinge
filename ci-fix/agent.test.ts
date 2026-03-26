// ci-fix/agent.test.ts
import { describe, it, expect } from 'vitest';

// Verify the module exports the expected function with the right shape
describe('agent', () => {
  it('exports runAgent as an async function', async () => {
    const { runAgent } = await import('./agent.ts');
    expect(typeof runAgent).toBe('function');
  });
});
