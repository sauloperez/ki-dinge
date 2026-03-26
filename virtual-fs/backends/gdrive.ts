import { google } from 'googleapis';
import type { drive_v3 } from 'googleapis';
import { StorageBackend } from '../backend.ts';

export interface GDriveOptions {
  keyFile: string;
  rootFolderPath: string;
}

const dbg = (msg: string) => process.stderr.write(`\x1b[2m[gdrive] ${msg}\x1b[0m\n`);

export class GDriveBackend implements StorageBackend {
  private options: GDriveOptions;
  private drive: drive_v3.Drive | null = null;
  private cache: Map<string, string> = new Map(); // readable path → file ID
  private folders: Set<string> = new Set(); // paths that are folders
  private initialized = false;

  constructor(options: GDriveOptions) {
    this.options = options;
  }

  private async init(): Promise<void> {
    if (this.initialized) return;

    dbg(`init keyFile=${this.options.keyFile} rootFolderPath=${this.options.rootFolderPath}`);

    const auth = new google.auth.GoogleAuth({
      keyFile: this.options.keyFile,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    this.drive = google.drive({ version: 'v3', auth });

    const rootId = await this.resolveRootPath();
    dbg(`root resolved → ${rootId}`);

    await this.buildCache(rootId, '');

    dbg(`cache built: ${this.cache.size} entries`);
    for (const [path, id] of this.cache) {
      dbg(`  ${this.folders.has(path) ? 'd' : 'f'} ${path} (${id})`);
    }

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
      dbg(`resolving segment '${segment}' under ${currentId}`);
      currentId = await this.resolveFolderSegment(segment, currentId);
      dbg(`  → ${currentId}`);
    }
    return currentId;
  }

  private async resolveFolderSegment(name: string, parentId: string): Promise<string> {
    const escapedName = name.replace(/'/g, "\\'");
    const q = `name = '${escapedName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    dbg(`files.list query: ${q}`);
    const res = await this.drive!.files.list({
      q,
      fields: 'files(id, name)',
      pageSize: 1,
    });
    dbg(`files.list response: ${JSON.stringify(res.data.files)}`);
    let file = res.data.files?.[0];

    // Service accounts don't have files under 'root'; shared folders appear in sharedWithMe
    if (!file?.id && parentId === 'root') {
      const sharedQ = `name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      dbg(`fallback sharedWithMe query: ${sharedQ}`);
      const sharedRes = await this.drive!.files.list({
        q: sharedQ,
        fields: 'files(id, name)',
        pageSize: 1,
      });
      dbg(`fallback response: ${JSON.stringify(sharedRes.data.files)}`);
      file = sharedRes.data.files?.[0];
    }

    if (!file?.id) throw new Error(`Folder not found: '${name}'`);
    return file.id;
  }

  private async buildCache(folderId: string, pathPrefix: string): Promise<void> {
    let pageToken: string | undefined;

    // When building from the service account's root, also include files shared
    // with it (they don't appear under 'root' in parents for service accounts)
    const isRoot = folderId === 'root' && pathPrefix === '';
    const q = isRoot
      ? `trashed = false and (('root' in parents) or sharedWithMe = true)`
      : `'${folderId}' in parents and trashed = false`;

    do {
      dbg(`buildCache query (prefix='${pathPrefix || '/'}'): ${q}`);
      const res = await this.drive!.files.list({
        q,
        fields: 'nextPageToken, files(id, name, mimeType)',
        pageSize: 1000,
        pageToken,
      });

      dbg(`buildCache got ${res.data.files?.length ?? 0} files, nextPageToken=${res.data.nextPageToken ?? 'none'}`);

      const files = res.data.files ?? [];
      for (const file of files) {
        if (!file.id || !file.name) continue;
        const filePath = pathPrefix ? `${pathPrefix}/${file.name}` : file.name;
        this.cache.set(filePath, file.id);
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          this.folders.add(filePath);
          await this.buildCache(file.id, filePath);
        }
      }

      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
  }

  async list(path?: string): Promise<string[]> {
    await this.init();
    dbg(`list(${path ?? ''})`);

    if (path !== undefined) {
      if (!this.cache.has(path)) throw new Error(`Path not found: '${path}'`);
      if (!this.folders.has(path)) throw new Error(`Not a folder: '${path}'`);
    }

    const prefix = path ? `${path}/` : '';
    const results: string[] = [];

    for (const key of this.cache.keys()) {
      if (!key.startsWith(prefix)) continue;
      const remainder = key.slice(prefix.length);
      if (!remainder.includes('/')) {
        results.push(remainder);
      }
    }

    dbg(`list → ${JSON.stringify(results)}`);
    return results;
  }

  async read(path: string): Promise<string> {
    await this.init();
    dbg(`read(${path})`);

    const fileId = this.cache.get(path);
    if (!fileId) throw new Error(`File not found: '${path}'`);

    dbg(`files.get fileId=${fileId}`);
    const res = await this.drive!.files.get(
      { fileId, alt: 'media' },
      { responseType: 'text' }
    );
    const preview = String(res.data).slice(0, 120);
    dbg(`files.get → ${preview}${String(res.data).length > 120 ? '…' : ''}`);

    return res.data as string;
  }
}
