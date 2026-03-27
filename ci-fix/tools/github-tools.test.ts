import { describe, it, expect } from 'vitest';
import { createGitHubTools } from './github-tools.ts';

describe('createGitHubTools', () => {
  it('returns the expected tools from GitHub SDK', () => {
    const tools = createGitHubTools({ token: 'fake-token' });
    expect(tools.listPullRequests).toBeDefined();
    expect(tools.createPullRequest).toBeDefined();
    expect(tools.addPullRequestComment).toBeDefined();
  });

  it('all tools have execute functions', () => {
    const tools = createGitHubTools({ token: 'fake-token' });
    expect(typeof tools.listPullRequests.execute).toBe('function');
    expect(typeof tools.createPullRequest.execute).toBe('function');
    expect(typeof tools.addPullRequestComment.execute).toBe('function');
  });
});
