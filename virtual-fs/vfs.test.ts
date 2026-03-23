import { describe, it, expect } from 'vitest';
import { VirtualFS } from './vfs.ts';

function makeBackend(files: Record<string, string>) {
  return {
    list: async () => Object.keys(files),
    read: async (path: string) => {
      if (!(path in files)) throw new Error(`File not found: ${path}`);
      return files[path];
    },
  };
}

describe('VFS', () => {
  it('reads a file from the backend', async () => {
    const vfs = VirtualFS.mount({ prefix: '', backend: makeBackend({ 'foo.ts': 'const x = 1;' }) });

    expect(await vfs.read('foo.ts')).toBe('const x = 1;');
  });

  it('throws when reading an unknown path', async () => {
    const vfs = VirtualFS.mount({ prefix: '', backend: makeBackend({ 'foo.ts': 'x' }) });

    await expect(vfs.read('missing.ts')).rejects.toThrow();
  });

  it('calls list() on the backend when listing', async () => {
    let listCalled = 0;
    const vfs = VirtualFS.mount({
      prefix: '',
      backend: {
        list: async () => { listCalled++; return []; },
        read: async (_: string) => '',
      },
    });
    await vfs.list();

    expect(listCalled).toBe(1);
  });

  it('lists files prefixed with the mount point', async () => {
    const vfs = VirtualFS.mount({ prefix: '/src', backend: makeBackend({ 'agent.ts': '' }) });

    expect(await vfs.list()).toEqual(['/src/agent.ts']);
  });

  it('reads a file using its virtual path', async () => {
    const vfs = VirtualFS.mount({ prefix: '/src', backend: makeBackend({ 'agent.ts': 'const x = 1;' }) });

    expect(await vfs.read('/src/agent.ts')).toBe('const x = 1;');
  });

  it('throws when reading an unknown virtual path', async () => {
    const vfs = VirtualFS.mount({ prefix: '/src', backend: makeBackend({ 'a.ts': '' }) });

    await expect(vfs.read('/src/missing.ts')).rejects.toThrow();
  });
});
