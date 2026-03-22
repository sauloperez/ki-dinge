import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LocalBackend } from './local.ts';

describe('LocalBackend', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'virtual-fs-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true });
  });

  it('lists files in the directory', async () => {
    await writeFile(join(dir, 'foo.ts'), '');
    await writeFile(join(dir, 'bar.ts'), '');

    const backend = new LocalBackend(dir);
    const files = await backend.list();

    expect(files).toEqual(expect.arrayContaining(['foo.ts', 'bar.ts']));
    expect(files).toHaveLength(2);
  });

  it('reads a file by name', async () => {
    await writeFile(join(dir, 'hello.ts'), 'const x = 1;');

    const backend = new LocalBackend(dir);
    const content = await backend.read('hello.ts');

    expect(content).toBe('const x = 1;');
  });
});
