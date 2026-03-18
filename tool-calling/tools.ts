import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';

const options: Partial<SimpleGitOptions> = {
  baseDir: process.cwd(),
  binary: 'git',
  maxConcurrentProcesses: 6,
  trimmed: false,
};

const git: SimpleGit = simpleGit(options);

const gitDiff = async (): Promise<string> => {
  return await git.diff();
};

const gitStatus = async (): Promise<string> => {
  const status = await git.status();
  return JSON.stringify(status);
}

export const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'gitDiff',
      description: 'Get the git diff of the most recent commit',
      parameters: {
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'gitStatus',
      description: 'Get the current git status of the repository',
      parameters: {}
    }
  }
]

type ToolFunction = () => Promise<string>;

export const TOOL_MAPPING: Record<string, ToolFunction> = {
  gitDiff,
  gitStatus,
};
