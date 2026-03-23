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
  };
}
