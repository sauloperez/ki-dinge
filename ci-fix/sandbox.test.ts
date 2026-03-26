import { describe, it, expect, afterAll } from 'vitest';
import { createSandbox, destroySandbox } from './sandbox.ts';

describe('sandbox', () => {
  let containerId: string;

  afterAll(async () => {
    if (containerId) await destroySandbox(containerId);
  });

  it('creates a running container and returns its ID', async () => {
    containerId = await createSandbox({ githubToken: 'fake-token' });
    expect(containerId).toBeTruthy();
    expect(containerId.length).toBeGreaterThan(10);
  }, 30_000);

  it('destroys the container', async () => {
    await destroySandbox(containerId);
    const { execSync } = await import('child_process');
    const result = execSync(`docker ps -q --filter id=${containerId}`, { encoding: 'utf-8' }).trim();
    expect(result).toBe('');
    containerId = '';
  });
});
