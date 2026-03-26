import { tool } from 'ai';
import { z } from 'zod';
import { createGithubTools as createSdkTools } from '@github-tools/sdk';

export function createGitHubTools({ token, dryRun }: { token: string; dryRun: boolean }) {
  if (dryRun) {
    return createDryRunTools();
  }

  const sdkTools = createSdkTools({ token });

  return {
    listPullRequests: sdkTools.listPullRequests!,
    createPullRequest: sdkTools.createPullRequest!,
    addPullRequestComment: sdkTools.addPullRequestComment!,
  };
}

function createDryRunTools() {
  return {
    listPullRequests: tool({
      description: 'List pull requests for a repository.',
      inputSchema: z.object({
        owner: z.string(),
        repo: z.string(),
        state: z.enum(['open', 'closed', 'all']),
        perPage: z.number(),
      }),
      execute: async (params: { owner: string; repo: string; state: string; perPage: number }) => {
        console.log('[DRY RUN] listPullRequests:', params);
        return [] as Array<{
          number: number; title: string; state: string; url: string;
          author: string | undefined; branch: string; base: string;
          draft: boolean | undefined; createdAt: string; updatedAt: string;
        }>;
      },
    }),

    createPullRequest: tool({
      description: 'Create a pull request.',
      inputSchema: z.object({
        owner: z.string(),
        repo: z.string(),
        title: z.string(),
        head: z.string(),
        base: z.string(),
        draft: z.boolean(),
        body: z.string().optional(),
      }),
      execute: async (params: { owner: string; repo: string; title: string; head: string; base: string; draft: boolean; body?: string }) => {
        console.log('[DRY RUN] Would create PR:', params.title);
        console.log('[DRY RUN]   head:', params.head, '→ base:', params.base);
        return {
          number: 0,
          title: params.title,
          url: 'https://github.com/dry-run/pr/1',
          state: 'open' as const,
          draft: params.draft as boolean | undefined,
          branch: params.head,
          base: params.base,
        };
      },
    }),

    addPullRequestComment: tool({
      description: 'Add a comment to a pull request.',
      inputSchema: z.object({
        owner: z.string(),
        repo: z.string(),
        pullNumber: z.number(),
        body: z.string(),
      }),
      execute: async (params: { owner: string; repo: string; pullNumber: number; body: string }) => {
        console.log('[DRY RUN] Would comment on PR #', params.pullNumber);
        console.log('[DRY RUN]   body:', params.body.substring(0, 100) + '...');
        return {
          id: 0,
          url: 'https://github.com/dry-run/comment/1',
          body: params.body as string | undefined,
          author: 'dry-run' as string | undefined,
          createdAt: new Date().toISOString(),
        };
      },
    }),
  };
}
