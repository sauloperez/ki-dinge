import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LocalBackend } from './local.ts';

describe('LocalBackend', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'virtual-fs-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true });
  });

  it('lists files and folders in the root directory', async () => {
    await writeFile(join(root, 'foo.ts'), '');
    await writeFile(join(root, 'bar.ts'), '');
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src/bar.ts'), '');

    const backend = new LocalBackend(root);
    const files = await backend.list();

    expect(files).toEqual(expect.arrayContaining(['foo.ts', 'bar.ts', 'src']));
    expect(files).toHaveLength(3);
  });

  it('lists files in a subdirectory', async () => {
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src/agent.ts'), '');
    await writeFile(join(root, 'src/utils.ts'), '');

    const backend = new LocalBackend(root);
    const files = await backend.list('src');

    expect(files).toEqual(expect.arrayContaining(['agent.ts', 'utils.ts']));
    expect(files).toHaveLength(2);
  });

  it('returns an empty array when the directory is empty', async () => {
    const backend = new LocalBackend(root);

    expect(await backend.list()).toEqual([]);
  });

  it('throws when listing a non-existent directory', async () => {
    const backend = new LocalBackend(root);

    await expect(backend.list('missing')).rejects.toThrow();
  });

  it('reads a file by name', async () => {
    await writeFile(join(root, 'hello.ts'), 'const x = 1;');

    const backend = new LocalBackend(root);

    expect(await backend.read('hello.ts')).toBe('const x = 1;');
  });

  it('reads a file in a subdirectory', async () => {
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src/agent.ts'), 'const x = 1;');

    const backend = new LocalBackend(root);

    expect(await backend.read('src/agent.ts')).toBe('const x = 1;');
  });

  it('throws when reading a non-existent file', async () => {
    const backend = new LocalBackend(root);

    await expect(backend.read('missing.ts')).rejects.toThrow();
  });
});
