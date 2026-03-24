import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a GoogleAuth with drive.readonly scope', async () => {
    const mockList = vi.mocked(google.drive({} as any).files.list);
    mockList.mockResolvedValue({ data: { files: [] } } as any);

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

describe('GDriveBackend — root path resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

describe('GDriveBackend — cache building', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    // Note: initialized is already true after first list(), so second list('src') reads from cache directly
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
