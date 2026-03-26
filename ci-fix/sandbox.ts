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
