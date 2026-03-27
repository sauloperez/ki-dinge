import { createGithubTools as createSdkTools } from '@github-tools/sdk';

export function createGitHubTools({ token }: { token: string }) {
  const sdkTools = createSdkTools({ token });

  return {
    listPullRequests: sdkTools.listPullRequests!,
    createPullRequest: sdkTools.createPullRequest!,
    addPullRequestComment: sdkTools.addPullRequestComment!,
  };
}
