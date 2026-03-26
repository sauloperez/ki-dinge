import { describe, it, expect } from 'vitest';
import { createCiTools } from './ci-tools.ts';

const ctx = { toolCallId: 'test', messages: [] as never[], abortSignal: undefined as never };

describe('createCiTools', () => {
  const tools = createCiTools({ scenario: 'test-failure' });

  it('returns get_pipeline_status, get_job_logs, get_test_results tools', () => {
    expect(tools.get_pipeline_status).toBeDefined();
    expect(tools.get_job_logs).toBeDefined();
    expect(tools.get_test_results).toBeDefined();
  });

  describe('get_pipeline_status', () => {
    it('returns pipeline with failed test job', async () => {
      const result = await tools.get_pipeline_status.execute!(
        { repo: 'acme/web-app', branch: 'feature/user-auth' },
        ctx,
      ) as { jobs: Array<{ name: string; status: string }> };
      expect(result.jobs).toHaveLength(3);
      expect(result.jobs.find((j: { name: string; status: string }) => j.name === 'test')?.status).toBe('failed');
    });
  });

  describe('get_job_logs', () => {
    it('returns logs for a valid job ID', async () => {
      const result = await tools.get_job_logs.execute!(
        { jobId: 'job-103' },
        ctx,
      ) as { logs?: string; error?: string };
      expect(result.logs).toContain('AssertionError');
    });

    it('returns error for unknown job ID', async () => {
      const result = await tools.get_job_logs.execute!(
        { jobId: 'job-999' },
        ctx,
      ) as { logs?: string; error?: string };
      expect(result.error).toBeDefined();
    });
  });

  describe('get_test_results', () => {
    it('returns structured test failures', async () => {
      const result = await tools.get_test_results.execute!(
        { jobId: 'job-103' },
        ctx,
      ) as { results: Array<{ file: string }> };
      expect(result.results).toHaveLength(1);
      expect(result.results[0].file).toBe('src/utils/calc.test.ts');
    });

    it('returns empty array for non-test jobs', async () => {
      const lintTools = createCiTools({ scenario: 'lint-error' });
      const result = await lintTools.get_test_results.execute!(
        { jobId: 'job-202' },
        ctx,
      ) as { results: Array<{ file: string }> };
      expect(result.results).toHaveLength(0);
    });
  });
});
