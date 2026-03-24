import { google } from 'googleapis';
import type { drive_v3 } from 'googleapis';
import { StorageBackend } from '../backend.ts';

export interface GDriveOptions {
  keyFile: string;
  rootFolderPath: string;
}

export class GDriveBackend implements StorageBackend {
  private options: GDriveOptions;
  private drive: drive_v3.Drive | null = null;
  private cache: Map<string, string> = new Map(); // readable path → file ID
  private initialized = false;

  constructor(options: GDriveOptions) {
    this.options = options;
  }

  private async init(): Promise<void> {
    if (this.initialized) return;

    const auth = new google.auth.GoogleAuth({
      keyFile: this.options.keyFile,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    this.drive = google.drive({ version: 'v3', auth });
    // Folder walking will be added in later tasks
    this.initialized = true;
  }

  async list(path?: string): Promise<string[]> {
    await this.init();
    return [];
  }

  async read(path: string): Promise<string> {
    await this.init();
    throw new Error(`File not found: ${path}`);
  }
}
