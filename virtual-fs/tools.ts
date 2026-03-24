import { tool } from 'ai';
import { z } from 'zod';
import type { VirtualFS } from './vfs.ts';

export function createVfsTools(vfs: VirtualFS) {
  return {
    list_files: tool({
      description: 'List all available files in the virtual filesystem',
      inputSchema: z.object({}),
      execute: async () => vfs.list(),
    }),
    read_file: tool({
      description: 'Read the contents of a file by its path',
      inputSchema: z.object({ path: z.string().describe('The file path to read') }),
      execute: async ({ path }) => vfs.read(path),
    }),
    grep_file: tool({
      description: 'Search a file for lines matching a regex pattern. Returns matching lines with their line numbers.',
      inputSchema: z.object({
        path: z.string().describe('The file path to search'),
        regex: z.string().describe('Regular expression pattern to match against each line'),
      }),
      execute: async ({ path, regex }) => vfs.grep(path, new RegExp(regex)),
    }),
  };
}
