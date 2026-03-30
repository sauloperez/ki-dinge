import { execFile } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execFile);

export async function createSandbox({ githubToken }: { githubToken: string }): Promise<string> {
  const { stdout } = await exec('docker', [
    'run', '-d',
    '--env', `GITHUB_TOKEN=${githubToken}`,
    '--name', `ci-fix-${Date.now()}`,
    'ci-fix-sandbox',
    'sleep', 'infinity',
  ]);
  return stdout.trim();
}

export async function destroySandbox(containerId: string): Promise<void> {
  await exec('docker', ['rm', '-f', containerId]);
}

export async function setupProject(containerId: string, repo: string, branch: string): Promise<void> {
  const cloneUrl = `https://github.com/${repo}.git`;
  await exec('docker', [
    'exec', containerId, 'sh', '-c',
    `git clone --depth=1 --branch "${branch}" "${cloneUrl}" /home/project && cd /home/project && npm install`,
  ]);
}

export async function initGitCredentials(containerId: string): Promise<void> {
  // Configure git to use GITHUB_TOKEN for authentication via credential helper
  // This allows git push to work without exposing the token in remote URLs
  const credentialHelper = '!f() { echo "username=x-access-token"; echo "password=$GITHUB_TOKEN"; }; f';
  await exec('docker', ['exec', containerId, 'sh', '-c',
    `git config --global credential.helper '${credentialHelper}' && \
     git config --global user.email "ci-fix-bot@localhost" && \
     git config --global user.name "CI Fix Bot"`,
  ]);
}
