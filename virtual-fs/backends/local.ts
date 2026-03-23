import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { StorageBackend } from '../backend.ts';

export class LocalBackend implements StorageBackend {
  constructor(private dir: string) { }

  async list(): Promise<string[]> {
    return readdir(this.dir);
  }

  async read(path: string): Promise<string> {
    try {
      return readFile(join(this.dir, path), 'utf-8');
    } catch (err: unknown) {
      throw err;
    }
  }
}
