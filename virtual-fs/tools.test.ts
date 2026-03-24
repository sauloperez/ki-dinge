import { describe, it, expect } from 'vitest';
import { VirtualFS } from './vfs.ts';
import { createVfsTools } from './tools.ts';

function makeBackend(files: Record<string, string>) {
  return {
    list: async () => Object.keys(files),
    read: async (path: string) => {
      if (!(path in files)) throw new Error(`File not found: ${path}`);
      return files[path];
    },
  };
}

describe('createVfsTools', () => {
  it('list_files returns all files from the vfs', async () => {
    const vfs = VirtualFS.mount({ prefix: '', backend: makeBackend({ 'a.ts': '', 'b.ts': '' }) });
    const tools = createVfsTools(vfs);

    const result = await tools.list_files.execute!({}, {} as never);

    expect(result).toEqual(expect.arrayContaining(['a.ts', 'b.ts']));
  });

  it('read_file returns the content of the requested path', async () => {
    const vfs = VirtualFS.mount({ prefix: '', backend: makeBackend({ 'foo.ts': 'const x = 1;' }) });
    const tools = createVfsTools(vfs);

    const result = await tools.read_file.execute!({ path: 'foo.ts' }, {} as never);

    expect(result).toBe('const x = 1;');
  });

  it('read_file throws for an unknown path', async () => {
    const vfs = VirtualFS.mount({ prefix: '', backend: makeBackend({ 'foo.ts': '' }) });
    const tools = createVfsTools(vfs);

    await expect(tools.read_file.execute!({ path: 'missing.ts' }, {} as never)).rejects.toThrow();
  });

  it('grep_file returns matching lines with line numbers', async () => {
    const vfs = VirtualFS.mount({ prefix: '', backend: makeBackend({
      'orders.ts': 'function createOrder() {}\nfunction cancelOrder() {}\nfunction updateStatus() {}',
    }) });
    const tools = createVfsTools(vfs);

    const result = await tools.grep_file.execute!({ path: 'orders.ts', regex: 'Order' }, {} as never);

    expect(result).toEqual([
      { line: 1, text: 'function createOrder() {}' },
      { line: 2, text: 'function cancelOrder() {}' },
    ]);
  });

  it('grep_file returns empty array when nothing matches', async () => {
    const vfs = VirtualFS.mount({ prefix: '', backend: makeBackend({ 'foo.ts': 'const x = 1;' }) });
    const tools = createVfsTools(vfs);

    const result = await tools.grep_file.execute!({ path: 'foo.ts', regex: 'nomatch' }, {} as never);

    expect(result).toEqual([]);
  });
});
