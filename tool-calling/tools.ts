import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';

const options: Partial<SimpleGitOptions> = {
  baseDir: process.cwd(),
  binary: 'git',
  maxConcurrentProcesses: 6,
  trimmed: false,
};

const git: SimpleGit = simpleGit(options);

type GitDiffArgs = { staged?: boolean; baseRef?: string; file?: string };
type GitStatusArgs = { file?: string };
type GitLogArgs = { maxCount?: number; file?: string; search?: string };

const gitDiff = async (args?: GitDiffArgs): Promise<string> => {
  const flags: string[] = [];
  if (args?.staged) flags.push('--staged');
  if (args?.baseRef) flags.push(args.baseRef);
  if (args?.file) flags.push(args.file);
  return await git.diff(flags);
};

const gitStatus = async (args?: GitStatusArgs): Promise<string> => {
  const flags: string[] = [];
  if (args?.file) flags.push(args.file);
  const status = await git.status(flags);
  return JSON.stringify(status);
};

const gitLog = async (args?: GitLogArgs): Promise<string> => {
  const options: GitLogArgs = {};
  if (args?.maxCount !== undefined) options.maxCount = args.maxCount;
  if (args?.file !== undefined) options.file = args.file;
  if (args?.search !== undefined) options['-S'] = args.search;
  const log = await git.log(options);
  return JSON.stringify(log);
};

export const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'gitDiff',
      description: 'Get the git diff of the repository',
      parameters: {
        type: 'object',
        properties: {
          staged: { type: 'boolean', description: 'Show staged (cached) changes instead of unstaged' },
          baseRef: { type: 'string', description: 'Commit ref, branch, or tag to diff against (e.g. main, HEAD~1, abc123)' },
          file: { type: 'string', description: 'Limit diff to a specific file path' },
        },
      },
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'gitStatus',
      description: 'Get the current git status of the repository',
      parameters: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Limit status to a specific file path' },
        },
      },
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'gitLog',
      description: 'Get the git commit log of the repository',
      parameters: {
        type: 'object',
        properties: {
          maxCount: { type: 'number', description: 'Maximum number of commits to return' },
          file: { type: 'string', description: 'Limit log to commits that changed a specific file' },
          search: { type: 'string', description: 'Find commits that added or removed a given string (-S pickaxe search)' },
        },
      },
    }
  }
]

type ToolFunction = (args?: Record<string, unknown>) => Promise<string>;

export const TOOL_MAPPING: Record<string, ToolFunction> = {
  gitDiff,
  gitStatus,
  gitLog,
};
