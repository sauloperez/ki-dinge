import { StorageBackend } from "./backend.ts";

export interface MountOptions {
  prefix: string;
  backend: StorageBackend;
}

export class VirtualFS {
  private constructor(
    private readonly prefix: string,
    private readonly backend: StorageBackend,
  ) {}

  public static mount({ prefix, backend }: MountOptions): VirtualFS {
    return new VirtualFS(prefix, backend);
  }

  public async list(): Promise<string[]> {
    const paths = await this.backend.list();
    return paths.map(p => this.prefix ? `${this.prefix}/${p}` : p);
  }

  public async read(path: string): Promise<string> {
    const backendPath = this.prefix ? path.slice(this.prefix.length + 1) : path;
    return await this.backend.read(backendPath);
  }

  public async grep(path: string, regex: RegExp): Promise<{ line: number; text: string }[]> {
    const content = await this.read(path);
    return content
      .split('\n')
      .flatMap((text, i) => regex.test(text) ? [{ line: i + 1, text }] : []);
  }
}
