import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export class LocalBackend {
  constructor(private dir: string) {}

  async list(): Promise<string[]> {
    return readdir(this.dir);
  }

  async read(path: string): Promise<string> {
    return readFile(join(this.dir, path), 'utf-8');
  }
}
