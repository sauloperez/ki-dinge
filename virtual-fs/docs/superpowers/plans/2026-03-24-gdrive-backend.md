# GDrive Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a `GDriveBackend` that satisfies `StorageBackend`, authenticates via a service account key file, resolves human-readable paths to Drive IDs internally, and surfaces readable names to the agent.

**Architecture:** `GDriveBackend` is constructed with a `keyFile` path and a `rootFolderPath` (e.g. `"My Drive/projects/storefront"`). On first use it authenticates with the Google Drive API using `googleapis`, resolves the root path to a folder ID, recursively walks the folder tree, and builds an in-memory `Map<readablePath, fileId>`. `list` and `read` use this cache; the agent and user only ever see readable paths.

**Tech Stack:** TypeScript, `googleapis` npm package, `vitest` for tests. Uses `.ts` imports (no compilation step, run via `tsx`).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backends/gdrive.ts` | Create | `GDriveBackend` class implementing `StorageBackend` |
| `backends/gdrive.test.ts` | Create | Unit tests with mocked googleapis drive client |
| `agent.ts` | Modify | Wire in `GDriveBackend` when env vars present |
| `package.json` | Modify | Add `googleapis` dependency |

---

## Task 1: Install `googleapis`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the dependency**

```bash
cd virtual-fs && pnpm add googleapis
```

- [ ] **Step 2: Verify it installed**

```bash
pnpm list googleapis
```

Expected: `googleapis <version>` listed.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(virtual-fs): add googleapis dependency"
```

---

## Task 2: Auth helper — obtain a Drive client

The first logical unit is getting an authenticated Drive API client from a service account key file. This is the foundation everything else builds on.

**Files:**
- Create: `backends/gdrive.ts` (auth section only)
- Create: `backends/gdrive.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backends/gdrive.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

// We'll mock googleapis before importing our module
vi.mock('googleapis', () => {
  const mockDrive = {
    files: {
      list: vi.fn(),
      get: vi.fn(),
    },
  };
  return {
    google: {
      auth: {
        GoogleAuth: vi.fn().mockImplementation(() => ({
          getClient: vi.fn().mockResolvedValue({}),
        })),
      },
      drive: vi.fn().mockReturnValue(mockDrive),
    },
  };
});

import { google } from 'googleapis';
import { GDriveBackend } from './gdrive.ts';

describe('GDriveBackend — auth', () => {
  it('creates a GoogleAuth with drive.readonly scope', async () => {
    const backend = new GDriveBackend({
      keyFile: '/fake/key.json',
      rootFolderPath: 'My Drive',
    });

    // Trigger initialization
    await backend.list();

    expect(google.auth.GoogleAuth).toHaveBeenCalledWith({
      keyFile: '/fake/key.json',
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test backends/gdrive
```

Expected: FAIL — `GDriveBackend` not found.

- [ ] **Step 3: Write minimal implementation**

Create `backends/gdrive.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test backends/gdrive
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backends/gdrive.ts backends/gdrive.test.ts
git commit -m "feat(virtual-fs): add GDriveBackend skeleton with auth"
```

---

## Task 3: Root path resolution — walk path segments to a folder ID

Given `rootFolderPath = "My Drive/projects/storefront"`, resolve each segment against the Drive API to get the final folder ID. `"My Drive"` is special — it's the implicit root (`root` alias in the API).

**Files:**
- Modify: `backends/gdrive.ts`
- Modify: `backends/gdrive.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `backends/gdrive.test.ts` (after the existing describe block):

```typescript
describe('GDriveBackend — root path resolution', () => {
  it('resolves a single-segment root path using the Drive root alias', async () => {
    const mockList = vi.mocked(google.drive({} as any).files.list);
    mockList.mockResolvedValue({ data: { files: [] } } as any);

    const backend = new GDriveBackend({
      keyFile: '/fake/key.json',
      rootFolderPath: 'My Drive',
    });

    await backend.list();

    // "My Drive" alone should not call files.list — it maps to 'root'
    expect(mockList).not.toHaveBeenCalledWith(
      expect.objectContaining({ q: expect.stringContaining("name = 'My Drive'") })
    );
  });

  it('resolves a multi-segment root path by querying each folder name', async () => {
    const mockList = vi.mocked(google.drive({} as any).files.list);
    mockList
      .mockResolvedValueOnce({ data: { files: [{ id: 'folder-projects', name: 'projects', mimeType: 'application/vnd.google-apps.folder' }] } } as any)
      .mockResolvedValue({ data: { files: [] } } as any);

    const backend = new GDriveBackend({
      keyFile: '/fake/key.json',
      rootFolderPath: 'My Drive/projects',
    });

    await backend.list();

    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({
      q: expect.stringContaining("name = 'projects'"),
    }));
  });

  it('throws if a path segment is not found', async () => {
    const mockList = vi.mocked(google.drive({} as any).files.list);
    mockList.mockResolvedValue({ data: { files: [] } } as any);

    const backend = new GDriveBackend({
      keyFile: '/fake/key.json',
      rootFolderPath: 'My Drive/nonexistent',
    });

    await expect(backend.list()).rejects.toThrow("Folder not found: 'nonexistent'");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test backends/gdrive
```

Expected: the new tests FAIL.

- [ ] **Step 3: Implement root path resolution in `init()`**

Update `backends/gdrive.ts` — replace the `init` method body:

```typescript
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
  const res = await this.drive!.files.list({
    q: `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 1,
  });
  const file = res.data.files?.[0];
  if (!file?.id) throw new Error(`Folder not found: '${name}'`);
  return file.id;
}

private async buildCache(folderId: string, pathPrefix: string): Promise<void> {
  // Placeholder — implemented in Task 4
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test backends/gdrive
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backends/gdrive.ts backends/gdrive.test.ts
git commit -m "feat(virtual-fs): resolve root folder path to Drive ID"
```

---

## Task 4: Cache building — recursively walk the folder tree

Walk the folder tree from the resolved root ID and populate `this.cache` with `readablePath → fileId` entries for every file and folder.

**Files:**
- Modify: `backends/gdrive.ts`
- Modify: `backends/gdrive.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `backends/gdrive.test.ts`:

```typescript
describe('GDriveBackend — cache building', () => {
  it('populates cache with files at the root level', async () => {
    const mockList = vi.mocked(google.drive({} as any).files.list);
    // Root walk: returns one file
    mockList.mockResolvedValue({
      data: {
        files: [{ id: 'file-1', name: 'README.md', mimeType: 'text/plain' }],
        nextPageToken: undefined,
      },
    } as any);

    const backend = new GDriveBackend({ keyFile: '/fake/key.json', rootFolderPath: 'My Drive' });
    const files = await backend.list();

    expect(files).toContain('README.md');
  });

  it('recursively indexes files in subfolders', async () => {
    const mockList = vi.mocked(google.drive({} as any).files.list);
    mockList
      // Root level: one folder
      .mockResolvedValueOnce({
        data: { files: [{ id: 'folder-src', name: 'src', mimeType: 'application/vnd.google-apps.folder' }], nextPageToken: undefined },
      } as any)
      // src folder contents: one file
      .mockResolvedValueOnce({
        data: { files: [{ id: 'file-agent', name: 'agent.ts', mimeType: 'text/plain' }], nextPageToken: undefined },
      } as any);

    const backend = new GDriveBackend({ keyFile: '/fake/key.json', rootFolderPath: 'My Drive' });
    await backend.list();

    // After init, list('src') should return agent.ts
    const files = await backend.list('src');
    expect(files).toContain('agent.ts');
  });

  it('handles paginated results', async () => {
    const mockList = vi.mocked(google.drive({} as any).files.list);
    mockList
      .mockResolvedValueOnce({
        data: {
          files: [{ id: 'file-1', name: 'a.ts', mimeType: 'text/plain' }],
          nextPageToken: 'page2',
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          files: [{ id: 'file-2', name: 'b.ts', mimeType: 'text/plain' }],
          nextPageToken: undefined,
        },
      } as any);

    const backend = new GDriveBackend({ keyFile: '/fake/key.json', rootFolderPath: 'My Drive' });
    const files = await backend.list();

    expect(files).toContain('a.ts');
    expect(files).toContain('b.ts');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test backends/gdrive
```

Expected: the new tests FAIL.

- [ ] **Step 3: Implement `buildCache`**

Replace the placeholder `buildCache` in `backends/gdrive.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test backends/gdrive
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backends/gdrive.ts backends/gdrive.test.ts
git commit -m "feat(virtual-fs): build path→id cache by walking Drive folder tree"
```

---

## Task 5: `list(path?)` — return readable names from cache

**Files:**
- Modify: `backends/gdrive.ts`
- Modify: `backends/gdrive.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `backends/gdrive.test.ts`:

```typescript
describe('GDriveBackend — list()', () => {
  // Helper: set up mock with a known folder structure
  function setupMockWithStructure() {
    const mockList = vi.mocked(google.drive({} as any).files.list);
    mockList.mockResolvedValue({
      data: {
        files: [
          { id: 'file-readme', name: 'README.md', mimeType: 'text/plain' },
          { id: 'folder-src', name: 'src', mimeType: 'application/vnd.google-apps.folder' },
        ],
        nextPageToken: undefined,
      },
    } as any);
  }

  it('lists root-level names when called without a path', async () => {
    setupMockWithStructure();
    const backend = new GDriveBackend({ keyFile: '/fake/key.json', rootFolderPath: 'My Drive' });

    const files = await backend.list();

    expect(files).toEqual(expect.arrayContaining(['README.md', 'src']));
  });

  it('lists direct children of a subfolder by path', async () => {
    const mockList = vi.mocked(google.drive({} as any).files.list);
    mockList
      .mockResolvedValueOnce({
        data: {
          files: [{ id: 'folder-src', name: 'src', mimeType: 'application/vnd.google-apps.folder' }],
          nextPageToken: undefined,
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          files: [{ id: 'file-agent', name: 'agent.ts', mimeType: 'text/plain' }],
          nextPageToken: undefined,
        },
      } as any);

    const backend = new GDriveBackend({ keyFile: '/fake/key.json', rootFolderPath: 'My Drive' });
    const files = await backend.list('src');

    expect(files).toEqual(['agent.ts']);
  });

  it('throws when the path does not exist in the cache', async () => {
    const mockList = vi.mocked(google.drive({} as any).files.list);
    mockList.mockResolvedValue({ data: { files: [], nextPageToken: undefined } } as any);

    const backend = new GDriveBackend({ keyFile: '/fake/key.json', rootFolderPath: 'My Drive' });

    await expect(backend.list('nonexistent')).rejects.toThrow("Path not found: 'nonexistent'");
  });

  it('throws when path points to a file, not a folder', async () => {
    const mockList = vi.mocked(google.drive({} as any).files.list);
    mockList.mockResolvedValue({
      data: {
        files: [{ id: 'file-readme', name: 'README.md', mimeType: 'text/plain' }],
        nextPageToken: undefined,
      },
    } as any);

    const backend = new GDriveBackend({ keyFile: '/fake/key.json', rootFolderPath: 'My Drive' });

    await expect(backend.list('README.md')).rejects.toThrow("Not a folder: 'README.md'");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test backends/gdrive
```

Expected: FAIL.

- [ ] **Step 3: Update `buildCache` to also track folders separately, then implement `list()`**

First, add a `folders` set to `GDriveBackend` to distinguish folder paths from file paths. Update the class to track this, then update `buildCache` to populate it, then implement `list()`:

In `backends/gdrive.ts`, add to the class fields:

```typescript
private folders: Set<string> = new Set(); // paths that are folders
```

Update the `buildCache` loop to record folders:

```typescript
this.cache.set(filePath, file.id);
if (file.mimeType === 'application/vnd.google-apps.folder') {
  this.folders.add(filePath);
  await this.buildCache(file.id, filePath);
}
```

Then add the `list` method:

```typescript
async list(path?: string): Promise<string[]> {
  await this.init();

  if (path !== undefined) {
    if (!this.cache.has(path)) throw new Error(`Path not found: '${path}'`);
    if (!this.folders.has(path)) throw new Error(`Not a folder: '${path}'`);
  }

  const prefix = path ? `${path}/` : '';
  const results: string[] = [];

  for (const key of this.cache.keys()) {
    if (!key.startsWith(prefix)) continue;
    const remainder = key.slice(prefix.length);
    // Direct children only — no slashes in the remainder
    if (!remainder.includes('/')) {
      results.push(remainder);
    }
  }

  return results;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test backends/gdrive
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backends/gdrive.ts backends/gdrive.test.ts
git commit -m "feat(virtual-fs): implement GDriveBackend.list() from path cache"
```

---

## Task 6: `read(path)` — fetch file content via Drive API

**Files:**
- Modify: `backends/gdrive.ts`
- Modify: `backends/gdrive.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `backends/gdrive.test.ts`:

```typescript
describe('GDriveBackend — read()', () => {
  it('fetches file content by readable path', async () => {
    const mockList = vi.mocked(google.drive({} as any).files.list);
    const mockGet = vi.mocked(google.drive({} as any).files.get);

    mockList.mockResolvedValue({
      data: { files: [{ id: 'file-readme', name: 'README.md', mimeType: 'text/plain' }], nextPageToken: undefined },
    } as any);

    mockGet.mockResolvedValue({ data: '# Hello World' } as any);

    const backend = new GDriveBackend({ keyFile: '/fake/key.json', rootFolderPath: 'My Drive' });
    const content = await backend.read('README.md');

    expect(mockGet).toHaveBeenCalledWith(
      expect.objectContaining({ fileId: 'file-readme', alt: 'media' }),
      expect.objectContaining({ responseType: 'text' })
    );
    expect(content).toBe('# Hello World');
  });

  it('throws when the path does not exist in the cache', async () => {
    const mockList = vi.mocked(google.drive({} as any).files.list);
    mockList.mockResolvedValue({ data: { files: [], nextPageToken: undefined } } as any);

    const backend = new GDriveBackend({ keyFile: '/fake/key.json', rootFolderPath: 'My Drive' });

    await expect(backend.read('missing.ts')).rejects.toThrow("File not found: 'missing.ts'");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test backends/gdrive
```

Expected: FAIL.

- [ ] **Step 3: Implement `read()`**

Replace the `read` method in `backends/gdrive.ts`:

```typescript
async read(path: string): Promise<string> {
  await this.init();

  const fileId = this.cache.get(path);
  if (!fileId) throw new Error(`File not found: '${path}'`);

  const res = await this.drive!.files.get(
    { fileId, alt: 'media' },
    { responseType: 'text' }
  );

  return res.data as string;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test backends/gdrive
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backends/gdrive.ts backends/gdrive.test.ts
git commit -m "feat(virtual-fs): implement GDriveBackend.read() via Drive files.get"
```

---

## Task 7: Wire `GDriveBackend` into `agent.ts`

When `GDRIVE_KEY_FILE` and `GDRIVE_ROOT_FOLDER_PATH` env vars are set, use `GDriveBackend` instead of `LocalBackend`.

**Files:**
- Modify: `agent.ts`

- [ ] **Step 1: Update `agent.ts`**

Two edits:

1. Add the import at the top of the file with the other imports:

```typescript
import { GDriveBackend } from './backends/gdrive.ts';
```

2. Replace the existing `const vfs = VirtualFS.mount(...)` line with:

```typescript
const backend = process.env.GDRIVE_KEY_FILE && process.env.GDRIVE_ROOT_FOLDER_PATH
  ? new GDriveBackend({
      keyFile: process.env.GDRIVE_KEY_FILE,
      rootFolderPath: process.env.GDRIVE_ROOT_FOLDER_PATH,
    })
  : new LocalBackend(new URL('./data', import.meta.url).pathname);

const vfs = VirtualFS.mount({ prefix: '', backend });
```

- [ ] **Step 2: Run all tests to ensure nothing regressed**

```bash
pnpm test
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add agent.ts
git commit -m "feat(virtual-fs): wire GDriveBackend into agent via env vars"
```

---

## Task 8: Run full test suite and typecheck

- [ ] **Step 1: Run all tests**

```bash
pnpm test
```

Expected: all tests PASS.

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Fix any issues found before proceeding**
