import { StorageBackend } from "./backend.ts";

export class VirtualFS {
  private backend: StorageBackend;
  private knownPaths: Set<string> = new Set();

  constructor(backend: StorageBackend) {
    this.backend = backend;
  }

  public async init() {
    const paths = await this.backend.list();
    this.knownPaths = new Set(paths);
  }

  public list(): string[] {
    return Array.from(this.knownPaths);
  }

  public async read(path: string): Promise<string> {
    if (!this.knownPaths.has(path)) {
      throw new Error(`File not found: ${path}`);
    }
    return await this.backend.read(path);
  }
}
