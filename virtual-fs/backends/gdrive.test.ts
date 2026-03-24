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
