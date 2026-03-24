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

    const rootId = await this.resolveRootPath();
    await this.buildCache(rootId, '');

    this.initialized = true;
  }

  private async resolveRootPath(): Promise<string> {
    const segments = this.options.rootFolderPath.split('/');
    // "My Drive" is the user's root — mapped to 'root' alias in Drive API
    if (segments[0] !== 'My Drive') {
      throw new Error("rootFolderPath must start with 'My Drive'");
    }

    let currentId = 'root';
    for (const segment of segments.slice(1)) {
      currentId = await this.resolveFolderSegment(segment, currentId);
    }
    return currentId;
  }

  private async resolveFolderSegment(name: string, parentId: string): Promise<string> {
    const escapedName = name.replace(/'/g, "\\'");
    const res = await this.drive!.files.list({
      q: `name = '${escapedName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 1,
    });
    const file = res.data.files?.[0];
    if (!file?.id) throw new Error(`Folder not found: '${name}'`);
    return file.id;
  }

  private async buildCache(folderId: string, pathPrefix: string): Promise<void> {
    let pageToken: string | undefined;

    do {
      const res = await this.drive!.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType)',
        pageSize: 1000,
        pageToken,
      });

      const files = res.data.files ?? [];
      for (const file of files) {
        if (!file.id || !file.name) continue;
        const filePath = pathPrefix ? `${pathPrefix}/${file.name}` : file.name;
        this.cache.set(filePath, file.id);
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          await this.buildCache(file.id, filePath);
        }
      }

      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
  }

  async list(path?: string): Promise<string[]> {
    await this.init();

    const prefix = path ? `${path}/` : '';
    const results: string[] = [];

    for (const key of this.cache.keys()) {
      if (!key.startsWith(prefix)) continue;
      const remainder = key.slice(prefix.length);
      if (!remainder.includes('/')) {
        results.push(remainder);
      }
    }

    return results;
  }

  async read(path: string): Promise<string> {
    await this.init();
    throw new Error(`File not found: ${path}`);
  }
}
