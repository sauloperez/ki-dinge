import { describe, it, expect } from 'vitest';
import { VirtualFS } from './vfs.ts';

function makeBackend(files: Record<string, string>) {
  return {
    list: async () => Object.keys(files),
    read: async (path: string) => files[path],
  };
}

describe('VFS', () => {
  it('reads a file from the backend', async () => {
    const backend = makeBackend({ 'foo.ts': 'const x = 1;' });
    const vfs = new VirtualFS(backend);
    await vfs.init();

    const content = await vfs.read('foo.ts');

    expect(content).toBe('const x = 1;');
  });

  it('throws when reading an unknown path', async () => {
    const backend = makeBackend({ 'foo.ts': 'x' });
    const vfs = new VirtualFS(backend);
    await vfs.init();

    await expect(vfs.read('missing.ts')).rejects.toThrow();
  });

  it('calls list() on the backend during init', async () => {
    let listCalled = 0;
    const backend = {
      list: async () => { listCalled++; return []; },
      read: async (_: string) => '',
    };
    const vfs = new VirtualFS(backend);
    await vfs.init();

    expect(listCalled).toBe(1);
  });
});
