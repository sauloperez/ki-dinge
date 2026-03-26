import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDrive = vi.hoisted(() => ({
  files: {
    list: vi.fn(),
    get: vi.fn(),
  },
}));

// We'll mock googleapis before importing our module
vi.mock('googleapis', () => {
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

beforeEach(() => {
  mockDrive.files.list.mockReset();
  mockDrive.files.get.mockReset();
  vi.mocked(google.auth.GoogleAuth).mockClear();
});

describe('GDriveBackend — auth', () => {
  it('creates a GoogleAuth with drive.readonly scope', async () => {
    mockDrive.files.list.mockResolvedValue({ data: { files: [] } });

    const backend = new GDriveBackend({
      keyFile: '/fake/key.json',
      rootFolderPath: 'My Drive',
    });

    await backend.list();

    expect(google.auth.GoogleAuth).toHaveBeenCalledWith({
      keyFile: '/fake/key.json',
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
  });
});

describe('GDriveBackend — root path resolution', () => {
  it('resolves a single-segment root path using the Drive root alias', async () => {
    mockDrive.files.list.mockResolvedValue({ data: { files: [] } });

    const backend = new GDriveBackend({
      keyFile: '/fake/key.json',
      rootFolderPath: 'My Drive',
    });

    await backend.list();

    expect(mockDrive.files.list).not.toHaveBeenCalledWith(
      expect.objectContaining({ q: expect.stringContaining("name = 'My Drive'") })
    );
  });

  it('resolves a multi-segment root path by querying each folder name', async () => {
    mockDrive.files.list
      .mockResolvedValueOnce({ data: { files: [{ id: 'folder-projects', name: 'projects', mimeType: 'application/vnd.google-apps.folder' }] } })
      .mockResolvedValue({ data: { files: [] } });

    const backend = new GDriveBackend({
      keyFile: '/fake/key.json',
      rootFolderPath: 'My Drive/projects',
    });

    await backend.list();

    expect(mockDrive.files.list).toHaveBeenCalledWith(expect.objectContaining({
      q: expect.stringContaining("name = 'projects'"),
    }));
  });

  it('throws if a path segment is not found after both parent-based and fallback searches', async () => {
    // Both the parent-based query and the sharedWithMe fallback return nothing
    mockDrive.files.list.mockResolvedValue({ data: { files: [] } });

    const backend = new GDriveBackend({
      keyFile: '/fake/key.json',
      rootFolderPath: 'My Drive/nonexistent',
    });

    await expect(backend.list()).rejects.toThrow("Folder not found: 'nonexistent'");
    // Two calls: parent-based query + fallback name-only query
    expect(mockDrive.files.list).toHaveBeenCalledTimes(2);
  });

  it('falls back to name-only search when folder is shared with the service account (not under root)', async () => {
    mockDrive.files.list
      .mockResolvedValueOnce({ data: { files: [] } }) // parent-based: not found under root
      .mockResolvedValueOnce({ data: { files: [{ id: 'folder-alpinisme', name: 'alpinisme', mimeType: 'application/vnd.google-apps.folder' }] } }) // fallback: found
      .mockResolvedValue({ data: { files: [], nextPageToken: undefined } }); // buildCache: empty contents

    const backend = new GDriveBackend({
      keyFile: '/fake/key.json',
      rootFolderPath: 'My Drive/alpinisme',
    });

    await backend.list();

    const calls = mockDrive.files.list.mock.calls;
    // First call uses parent constraint
    expect(calls[0][0].q).toContain("'root' in parents");
    // Second call is the fallback — no parent constraint
    expect(calls[1][0].q).not.toContain("in parents");
    expect(calls[1][0].q).toContain("name = 'alpinisme'");
  });
});

describe('GDriveBackend — cache building', () => {
  it('uses sharedWithMe query when building cache from root (service account support)', async () => {
    mockDrive.files.list.mockResolvedValue({ data: { files: [], nextPageToken: undefined } });

    const backend = new GDriveBackend({ keyFile: '/fake/key.json', rootFolderPath: 'My Drive' });
    await backend.list();

    const rootQuery = mockDrive.files.list.mock.calls[0][0].q as string;
    expect(rootQuery).toContain('sharedWithMe = true');
    expect(rootQuery).toContain("'root' in parents");
  });

  it('populates cache with files at the root level', async () => {
    mockDrive.files.list.mockResolvedValue({
      data: {
        files: [{ id: 'file-1', name: 'README.md', mimeType: 'text/plain' }],
        nextPageToken: undefined,
      },
    });

    const backend = new GDriveBackend({ keyFile: '/fake/key.json', rootFolderPath: 'My Drive' });
    const files = await backend.list();

    expect(files).toContain('README.md');
  });

  it('recursively indexes files in subfolders', async () => {
    mockDrive.files.list
      .mockResolvedValueOnce({
        data: { files: [{ id: 'folder-src', name: 'src', mimeType: 'application/vnd.google-apps.folder' }], nextPageToken: undefined },
      })
      .mockResolvedValueOnce({
        data: { files: [{ id: 'file-agent', name: 'agent.ts', mimeType: 'text/plain' }], nextPageToken: undefined },
      });

    const backend = new GDriveBackend({ keyFile: '/fake/key.json', rootFolderPath: 'My Drive' });
    await backend.list();

    const files = await backend.list('src');
    expect(files).toContain('agent.ts');
  });

  it('handles paginated results', async () => {
    mockDrive.files.list
      .mockResolvedValueOnce({
        data: {
          files: [{ id: 'file-1', name: 'a.ts', mimeType: 'text/plain' }],
          nextPageToken: 'page2',
        },
      })
      .mockResolvedValueOnce({
        data: {
          files: [{ id: 'file-2', name: 'b.ts', mimeType: 'text/plain' }],
          nextPageToken: undefined,
        },
      });

    const backend = new GDriveBackend({ keyFile: '/fake/key.json', rootFolderPath: 'My Drive' });
    const files = await backend.list();

    expect(files).toContain('a.ts');
    expect(files).toContain('b.ts');
  });
});

describe('GDriveBackend — list() validation', () => {
  it('lists root-level names when called without a path', async () => {
    // First call returns root contents (including a folder that triggers recursive buildCache)
    // Fallback: empty so the recursive call for 'src' terminates immediately
    mockDrive.files.list
      .mockResolvedValueOnce({
        data: {
          files: [
            { id: 'file-readme', name: 'README.md', mimeType: 'text/plain' },
            { id: 'folder-src', name: 'src', mimeType: 'application/vnd.google-apps.folder' },
          ],
          nextPageToken: undefined,
        },
      })
      .mockResolvedValue({ data: { files: [], nextPageToken: undefined } });

    const backend = new GDriveBackend({ keyFile: '/fake/key.json', rootFolderPath: 'My Drive' });
    const files = await backend.list();

    expect(files).toEqual(expect.arrayContaining(['README.md', 'src']));
  });

  it('lists direct children of a subfolder by path', async () => {
    mockDrive.files.list
      .mockResolvedValueOnce({
        data: {
          files: [{ id: 'folder-src', name: 'src', mimeType: 'application/vnd.google-apps.folder' }],
          nextPageToken: undefined,
        },
      })
      .mockResolvedValueOnce({
        data: {
          files: [{ id: 'file-agent', name: 'agent.ts', mimeType: 'text/plain' }],
          nextPageToken: undefined,
        },
      });

    const backend = new GDriveBackend({ keyFile: '/fake/key.json', rootFolderPath: 'My Drive' });
    const files = await backend.list('src');

    expect(files).toEqual(['agent.ts']);
  });

  it('throws when the path does not exist in the cache', async () => {
    mockDrive.files.list.mockResolvedValue({ data: { files: [], nextPageToken: undefined } });

    const backend = new GDriveBackend({ keyFile: '/fake/key.json', rootFolderPath: 'My Drive' });

    await expect(backend.list('nonexistent')).rejects.toThrow("Path not found: 'nonexistent'");
  });

  it('throws when path points to a file, not a folder', async () => {
    mockDrive.files.list.mockResolvedValue({
      data: {
        files: [{ id: 'file-readme', name: 'README.md', mimeType: 'text/plain' }],
        nextPageToken: undefined,
      },
    });

    const backend = new GDriveBackend({ keyFile: '/fake/key.json', rootFolderPath: 'My Drive' });

    await expect(backend.list('README.md')).rejects.toThrow("Not a folder: 'README.md'");
  });
});

describe('GDriveBackend — read()', () => {
  it('fetches file content by readable path', async () => {
    mockDrive.files.list.mockResolvedValue({
      data: { files: [{ id: 'file-readme', name: 'README.md', mimeType: 'text/plain' }], nextPageToken: undefined },
    });
    mockDrive.files.get.mockResolvedValue({ data: '# Hello World' });

    const backend = new GDriveBackend({ keyFile: '/fake/key.json', rootFolderPath: 'My Drive' });
    const content = await backend.read('README.md');

    expect(mockDrive.files.get).toHaveBeenCalledWith(
      expect.objectContaining({ fileId: 'file-readme', alt: 'media' }),
      expect.objectContaining({ responseType: 'text' })
    );
    expect(content).toBe('# Hello World');
  });

  it('throws when the path does not exist in the cache', async () => {
    mockDrive.files.list.mockResolvedValue({ data: { files: [], nextPageToken: undefined } });

    const backend = new GDriveBackend({ keyFile: '/fake/key.json', rootFolderPath: 'My Drive' });

    await expect(backend.read('missing.ts')).rejects.toThrow("File not found: 'missing.ts'");
  });
});
