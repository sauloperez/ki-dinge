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
