export interface StorageBackend {
  list(): Promise<string[]>;
  read(path: string): Promise<string>;
}
