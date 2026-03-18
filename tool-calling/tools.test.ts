import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLog = vi.fn();
const mockDiff = vi.fn();
const mockStatus = vi.fn();

vi.mock('simple-git', () => ({
  simpleGit: vi.fn().mockReturnValue({
    log: mockLog,
    diff: mockDiff,
    status: mockStatus,
  }),
}));

const { tools, TOOL_MAPPING } = await import('./tools.js');

describe('tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('gitDiff', () => {
    it('runs an unstaged diff with no arguments', async () => {
      mockDiff.mockResolvedValueOnce('diff output');

      await TOOL_MAPPING['gitDiff']();

      expect(mockDiff).toHaveBeenCalledWith([]);
    });

    it('passes --staged when staged is true', async () => {
      mockDiff.mockResolvedValueOnce('staged diff');

      await TOOL_MAPPING['gitDiff']({ staged: true });

      expect(mockDiff).toHaveBeenCalledWith(['--staged']);
    });

    it('passes the file path when file is provided', async () => {
      mockDiff.mockResolvedValueOnce('file diff');

      await TOOL_MAPPING['gitDiff']({ file: 'src/index.ts' });

      expect(mockDiff).toHaveBeenCalledWith(['src/index.ts']);
    });

    it('combines staged and file arguments', async () => {
      mockDiff.mockResolvedValueOnce('combined diff');

      await TOOL_MAPPING['gitDiff']({ staged: true, file: 'src/index.ts' });

      expect(mockDiff).toHaveBeenCalledWith(['--staged', 'src/index.ts']);
    });

    it('passes baseRef as the diff target', async () => {
      mockDiff.mockResolvedValueOnce('ref diff');

      await TOOL_MAPPING['gitDiff']({ baseRef: 'main' });

      expect(mockDiff).toHaveBeenCalledWith(['main']);
    });

    it('combines baseRef and file', async () => {
      mockDiff.mockResolvedValueOnce('ref file diff');

      await TOOL_MAPPING['gitDiff']({ baseRef: 'HEAD~1', file: 'src/index.ts' });

      expect(mockDiff).toHaveBeenCalledWith(['HEAD~1', 'src/index.ts']);
    });
  });

  describe('gitStatus', () => {
    it('returns full status with no arguments', async () => {
      const fakeStatus = { current: 'main', files: [] };
      mockStatus.mockResolvedValueOnce(fakeStatus);

      await TOOL_MAPPING['gitStatus']();

      expect(mockStatus).toHaveBeenCalledWith([]);
    });

    it('passes the file path when file is provided', async () => {
      const fakeStatus = { current: 'main', files: [] };
      mockStatus.mockResolvedValueOnce(fakeStatus);

      await TOOL_MAPPING['gitStatus']({ file: 'src/index.ts' });

      expect(mockStatus).toHaveBeenCalledWith(['src/index.ts']);
    });
  });

  describe('gitLog', () => {
    it('is registered in the tools array', () => {
      const names = tools.map((t) => t.function.name);
      expect(names).toContain('gitLog');
    });

    it('is available in TOOL_MAPPING', () => {
      expect(TOOL_MAPPING['gitLog']).toBeTypeOf('function');
    });

    it('returns the git log as a JSON string', async () => {
      const fakeLog = { all: [{ hash: 'abc', message: 'init' }], total: 1, latest: null };
      mockLog.mockResolvedValueOnce(fakeLog);

      const result = await TOOL_MAPPING['gitLog']();

      expect(result).toBe(JSON.stringify(fakeLog));
    });

    it('passes maxCount when provided', async () => {
      mockLog.mockResolvedValueOnce({ all: [], total: 0, latest: null });

      await TOOL_MAPPING['gitLog']({ maxCount: 5 });

      expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({ maxCount: 5 }));
    });

    it('passes file path when provided', async () => {
      mockLog.mockResolvedValueOnce({ all: [], total: 0, latest: null });

      await TOOL_MAPPING['gitLog']({ file: 'src/index.ts' });

      expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({ file: 'src/index.ts' }));
    });

    it('combines maxCount and file when both provided', async () => {
      mockLog.mockResolvedValueOnce({ all: [], total: 0, latest: null });

      await TOOL_MAPPING['gitLog']({ maxCount: 3, file: 'src/index.ts' });

      expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({ maxCount: 3, file: 'src/index.ts' }));
    });

    it('passes -S when search is provided', async () => {
      mockLog.mockResolvedValueOnce({ all: [], total: 0, latest: null });

      await TOOL_MAPPING['gitLog']({ search: 'my string' });

      expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({ '-S': 'my string' }));
    });
  });
});
