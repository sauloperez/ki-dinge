import { tool } from 'ai';
import { z } from 'zod';
import { execFile } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execFile);

async function dockerExec(containerId: string, command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await exec('docker', ['exec', containerId, 'sh', '-c', command]);
    return { stdout, stderr, exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout || '', stderr: err.stderr || '', exitCode: err.code || 1 };
  }
}

export function createSandboxTools({ containerId }: { containerId: string }) {
  return {
    read_file: tool({
      description: 'Read the contents of a file inside the sandbox.',
      inputSchema: z.object({
        path: z.string().describe('Absolute path to the file'),
      }),
      execute: async ({ path }: { path: string }) => {
        const result = await dockerExec(containerId, `cat "${path}"`);
        if (result.exitCode !== 0) return { error: result.stderr.trim() || `File not found: ${path}` };
        return { content: result.stdout };
      },
    }),

    write_file: tool({
      description: 'Write content to a file inside the sandbox. Creates parent directories if needed.',
      inputSchema: z.object({
        path: z.string().describe('Absolute path to the file'),
        content: z.string().describe('File content to write'),
      }),
      execute: async ({ path, content }: { path: string; content: string }) => {
        const dir = path.substring(0, path.lastIndexOf('/'));
        await dockerExec(containerId, `mkdir -p "${dir}"`);
        const b64 = Buffer.from(content).toString('base64');
        const result = await dockerExec(containerId, `echo "${b64}" | base64 -d > "${path}"`);
        if (result.exitCode !== 0) return { success: false, error: result.stderr.trim() };
        return { success: true };
      },
    }),

    search_code: tool({
      description: 'Search for a pattern in files inside the sandbox. Returns matching lines with file paths and line numbers.',
      inputSchema: z.object({
        pattern: z.string().describe('Search pattern (grep regex)'),
        glob: z.string().optional().describe('File glob to filter (e.g., "*.ts")'),
      }),
      execute: async ({ pattern, glob }: { pattern: string; glob?: string }) => {
        const includeFlag = glob ? `--include="${glob}"` : '';
        const result = await dockerExec(containerId, `grep -rn ${includeFlag} "${pattern}" /home/project/ 2>/dev/null || true`);
        const matches = result.stdout.trim().split('\n').filter(Boolean).map(line => {
          const [filePath, lineNum, ...rest] = line.split(':');
          return { file: filePath, lineNumber: parseInt(lineNum, 10), line: rest.join(':').trim() };
        });
        return { matches };
      },
    }),

    list_files: tool({
      description: 'List files in a directory inside the sandbox.',
      inputSchema: z.object({
        path: z.string().optional().describe('Directory path (defaults to /home/project)'),
      }),
      execute: async ({ path }: { path?: string }) => {
        const dir = path || '/home/project';
        const result = await dockerExec(containerId, `ls -1 "${dir}"`);
        if (result.exitCode !== 0) return { error: result.stderr.trim() || `Directory not found: ${dir}` };
        return { files: result.stdout.trim().split('\n').filter(Boolean) };
      },
    }),

    run_command: tool({
      description: 'Run a shell command inside the sandbox. Returns stdout, stderr, and exit code.',
      inputSchema: z.object({
        command: z.string().describe('Shell command to execute'),
      }),
      execute: async ({ command }: { command: string }) => {
        return await dockerExec(containerId, command);
      },
    }),
  };
}
