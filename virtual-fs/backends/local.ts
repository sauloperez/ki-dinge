import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { StorageBackend } from '../backend.ts';

export class LocalBackend implements StorageBackend {
  constructor(private root: string) { }

  async list(path?: string): Promise<string[]> {
    return readdir(path ? join(this.root, path) : this.root);
  }

  async read(path: string): Promise<string> {
    try {
      return readFile(join(this.root, path), 'utf-8');
    } catch (err: unknown) {
      throw err;
    }
  }
}
