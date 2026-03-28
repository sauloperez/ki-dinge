import { tool } from 'ai';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture(scenario: string, file: string): Record<string, unknown> {
  const path = join(__dirname, '..', 'fixtures', scenario, file);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export function createCiTools({ scenario }: { scenario: string }) {
  const pipelineData = loadFixture(scenario, 'pipeline-status.json') as {
    repo: string;
    branch: string;
    jobs: Array<{ id: string; name: string; status: string }>;
  };
  const logsData = loadFixture(scenario, 'job-logs.json') as Record<string, string>;
  const testData = loadFixture(scenario, 'test-results.json') as Record<string, unknown> & {
    message?: string;
  };

  return {
    get_pipeline_status: tool({
      description: 'Get the CI pipeline status for a repo and branch. Returns a list of jobs with their status (passed/failed/skipped) and job IDs.',
      inputSchema: z.object({
        repo: z.string().describe('GitHub org/repo identifier'),
        branch: z.string().describe('Branch name'),
      }),
      execute: async ({ repo, branch }: { repo: string; branch: string }) => ({
        repo,
        branch,
        jobs: pipelineData.jobs,
      }),
    }),

    get_job_logs: tool({
      description: 'Get the raw log output for a specific CI job. Returns the build output truncated to the relevant failure section.',
      inputSchema: z.object({
        jobId: z.string().describe('The job ID from get_pipeline_status'),
      }),
      execute: async ({ jobId }: { jobId: string }) => {
        const logs = logsData[jobId];
        if (!logs) return { error: `No logs found for job ${jobId}` };
        return { logs };
      },
    }),

    get_test_results: tool({
      description: 'Get structured test results for a CI job. Returns an array of failures with file, test name, error, and stack trace. Returns empty array for non-test jobs.',
      inputSchema: z.object({
        jobId: z.string().describe('The job ID from get_pipeline_status'),
      }),
      execute: async ({ jobId }: { jobId: string }) => {
        const results = testData[jobId] as Array<{ file: string; testName: string; error: string; stackTrace: string }> | undefined;
        if (!results) return { results: [] as Array<{ file: string; testName: string; error: string; stackTrace: string }>, message: testData.message || `No test results for job ${jobId}` };
        return { results };
      },
    }),
  };
}
