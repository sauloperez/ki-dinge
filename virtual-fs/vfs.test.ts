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

describe('list()', () => {
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
});

describe('read()', () => {
  it('reads a file from the backend', async () => {
    const vfs = VirtualFS.mount({ prefix: '', backend: makeBackend({ 'foo.ts': 'const x = 1;' }) });

    expect(await vfs.read('foo.ts')).toBe('const x = 1;');
  });

  it('throws when reading an unknown path', async () => {
    const vfs = VirtualFS.mount({ prefix: '', backend: makeBackend({ 'foo.ts': 'x' }) });

    await expect(vfs.read('missing.ts')).rejects.toThrow();
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

describe('grep()', () => {
  it('returns matching lines with 1-based line numbers', async () => {
    const vfs = VirtualFS.mount({ prefix: '', backend: makeBackend({ 'foo.ts': 'const x = 1;\nconst y = 2;\nconst z = 3;' }) });

    expect(await vfs.grep('foo.ts', /y/)).toEqual([{ line: 2, text: 'const y = 2;' }]);
  });

  it('returns multiple matches', async () => {
    const vfs = VirtualFS.mount({ prefix: '', backend: makeBackend({ 'foo.ts': 'foo\nbar\nfoo' }) });

    expect(await vfs.grep('foo.ts', /foo/)).toEqual([
      { line: 1, text: 'foo' },
      { line: 3, text: 'foo' },
    ]);
  });

  it('returns empty array when nothing matches', async () => {
    const vfs = VirtualFS.mount({ prefix: '', backend: makeBackend({ 'foo.ts': 'hello\nworld' }) });

    expect(await vfs.grep('foo.ts', /missing/)).toEqual([]);
  });

  it('works with virtual paths when a prefix is set', async () => {
    const vfs = VirtualFS.mount({ prefix: '/src', backend: makeBackend({ 'agent.ts': 'export function foo() {}\nexport function bar() {}' }) });

    expect(await vfs.grep('/src/agent.ts', /foo/)).toEqual([{ line: 1, text: 'export function foo() {}' }]);
  });

  it('throws when the file does not exist', async () => {
    const vfs = VirtualFS.mount({ prefix: '', backend: makeBackend({}) });

    await expect(vfs.grep('missing.ts', /x/)).rejects.toThrow();
  });
});
