export interface StorageBackend {
  list(path?: string): Promise<string[]>;
  read(path: string): Promise<string>;
}
