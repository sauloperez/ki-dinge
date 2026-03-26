import { describe, it, expect } from 'vitest';
import { createGitHubTools } from './github-tools.ts';

const ctx = { toolCallId: 'test', messages: [] as never[], abortSignal: undefined as never };

describe('createGitHubTools', () => {
  it('returns the expected tools', () => {
    const tools = createGitHubTools({ token: 'fake-token', dryRun: false });
    expect(tools.listPullRequests).toBeDefined();
    expect(tools.createPullRequest).toBeDefined();
    expect(tools.addPullRequestComment).toBeDefined();
  });

  it('in dry-run mode, still returns tools (they log instead of executing)', () => {
    const tools = createGitHubTools({ token: 'fake-token', dryRun: true });
    expect(tools.createPullRequest).toBeDefined();
  });

  it('dry-run createPullRequest returns a mock response', async () => {
    const tools = createGitHubTools({ token: 'fake-token', dryRun: true });
    const result = await tools.createPullRequest.execute!(
      { owner: 'acme', repo: 'web-app', title: 'fix: test', body: 'fixes', head: 'fix-branch', base: 'main', draft: false },
      ctx,
    ) as { url: string; number: number };
    expect(result.url).toContain('dry-run');
    expect(result.number).toBe(0);
  });

  it('dry-run listPullRequests returns empty array', async () => {
    const tools = createGitHubTools({ token: 'fake-token', dryRun: true });
    const result = await tools.listPullRequests.execute!(
      { owner: 'acme', repo: 'web-app', state: 'open', perPage: 10 },
      ctx,
    ) as unknown[];
    expect(result).toHaveLength(0);
  });

  it('dry-run addPullRequestComment returns a mock response', async () => {
    const tools = createGitHubTools({ token: 'fake-token', dryRun: true });
    const result = await tools.addPullRequestComment.execute!(
      { owner: 'acme', repo: 'web-app', pullNumber: 1, body: 'looks good' },
      ctx,
    ) as { url: string };
    expect(result.url).toContain('dry-run');
  });
});
