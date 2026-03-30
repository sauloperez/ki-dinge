import { createGithubTools as createSdkTools, type GithubTools } from '@github-tools/sdk';

type GitHubTools = Required<Pick<GithubTools, 'listPullRequests' | 'createPullRequest' | 'addPullRequestComment'>>;

export function createGitHubTools({ token }: { token: string }): GitHubTools {
  const sdkTools = createSdkTools({ token, requireApproval: false });

  return {
    listPullRequests: sdkTools.listPullRequests!,
    createPullRequest: sdkTools.createPullRequest!,
    addPullRequestComment: sdkTools.addPullRequestComment!,
  };
}
