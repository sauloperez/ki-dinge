# CI Fix Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an autonomous agent that diagnoses CircleCI failures and submits fix PRs, running inside a Docker sandbox.

**Architecture:** Single-loop agent using Vercel AI SDK `streamText` with three tool groups (CI mock, Docker sandbox, GitHub). CLI parses args, spins up a Docker container, runs the agent loop, tears down the container.

**Tech Stack:** TypeScript/tsx, Vercel AI SDK (`ai`), `@github-tools/sdk`, Docker, zod, Vitest

**Spec:** `docs/superpowers/specs/2026-03-26-ci-fix-agent-design.md`

---

## File Structure

```
ci-fix/
├── index.ts                 — CLI entry: parse args, preflight checks, orchestrate sandbox + agent
├── agent.ts                 — Agent loop: streamText call with tools, streaming output
├── system-prompt.ts         — SYSTEM_PROMPT constant
├── tools/
│   ├── ci-tools.ts          — createCiTools(scenario) → mock-backed CI tools
│   ├── sandbox-tools.ts     — createSandboxTools(containerId) → docker exec tools
│   └── github-tools.ts      — createGitHubTools(token, dryRun) → cherry-picked from @github-tools/sdk
├── sandbox.ts               — createSandbox() / destroySandbox() — Docker container lifecycle
├── fixtures/
│   ├── test-failure/
│   │   ├── pipeline-status.json
│   │   ├── job-logs.json
│   │   └── test-results.json
│   └── lint-error/
│       ├── pipeline-status.json
│       ├── job-logs.json
│       └── test-results.json
├── Dockerfile               — Sandbox base image (node:20-slim + git)
├── package.json
├── tsconfig.json
└── README.md
```

**Design decisions:**
- `agent.ts` separated from `index.ts` so the agent loop is testable independently from CLI concerns.
- Each tool factory returns Vercel AI SDK `tool()` definitions, spread into the `streamText` call.
- Fixtures are plain JSON files loaded by `ci-tools.ts` based on the `--scenario` flag.

---

## Task 1: Project Scaffolding

**Files:**
- Create: `ci-fix/package.json`
- Create: `ci-fix/tsconfig.json`
- Create: `ci-fix/.gitignore`

- [x] **Step 1: Create package.json**

```json
{
  "name": "ci-fix",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "tsx index.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "ai": "latest",
    "@github-tools/sdk": "latest",
    "dotenv": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@types/node": "latest",
    "tsx": "latest",
    "typescript": "latest",
    "vitest": "^4.1.0"
  }
}
```

- [x] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts"]
}
```

- [x] **Step 3: Create .gitignore**

```
node_modules/
.env
dist/
```

- [x] **Step 4: Install dependencies**

Run: `cd ci-fix && pnpm install`

- [x] **Step 5: Verify typecheck runs**

Run: `cd ci-fix && pnpm typecheck`
Expected: Passes (no TS files yet, should succeed cleanly)

- [x] **Step 6: Commit**

```bash
git add ci-fix/package.json ci-fix/tsconfig.json ci-fix/.gitignore ci-fix/pnpm-lock.yaml
git commit -m "feat(ci-fix): scaffold project with dependencies"
```

---

## Task 2: Mock CI Fixtures

**Files:**
- Create: `ci-fix/fixtures/test-failure/pipeline-status.json`
- Create: `ci-fix/fixtures/test-failure/job-logs.json`
- Create: `ci-fix/fixtures/test-failure/test-results.json`
- Create: `ci-fix/fixtures/lint-error/pipeline-status.json`
- Create: `ci-fix/fixtures/lint-error/job-logs.json`
- Create: `ci-fix/fixtures/lint-error/test-results.json`

- [x] **Step 1: Create test-failure/pipeline-status.json**

```json
{
  "repo": "acme/web-app",
  "branch": "feature/user-auth",
  "jobs": [
    { "id": "job-101", "name": "install", "status": "passed" },
    { "id": "job-102", "name": "lint", "status": "passed" },
    { "id": "job-103", "name": "test", "status": "failed" }
  ]
}
```

- [x] **Step 2: Create test-failure/job-logs.json**

```json
{
  "job-103": "$ npm test\n\n> web-app@1.0.0 test\n> vitest run\n\n ✓ src/utils/format.test.ts (2 tests)\n ✗ src/utils/calc.test.ts (1 test)\n   × calculateDiscount: applies 10% discount for orders over $100\n\n     AssertionError: expected 95 to be 90\n\n     ❯ src/utils/calc.test.ts:8:28\n\n      6|   it('applies 10% discount for orders over $100', () => {\n      7|     const result = calculateDiscount(100, 0.1);\n      8|     expect(result).toBe(90);\n                              ^\n      9|   });\n     10| });\n\nTest Files  1 failed | 1 passed (2)\nTests  1 failed | 2 passed (3)\n\nProcess exited with code 1"
}
```

- [x] **Step 3: Create test-failure/test-results.json**

```json
{
  "job-103": [
    {
      "file": "src/utils/calc.test.ts",
      "testName": "calculateDiscount: applies 10% discount for orders over $100",
      "error": "AssertionError: expected 95 to be 90",
      "stackTrace": "at src/utils/calc.test.ts:8:28"
    }
  ]
}
```

- [x] **Step 4: Create lint-error/pipeline-status.json**

```json
{
  "repo": "acme/web-app",
  "branch": "feature/search",
  "jobs": [
    { "id": "job-201", "name": "install", "status": "passed" },
    { "id": "job-202", "name": "lint", "status": "failed" },
    { "id": "job-203", "name": "test", "status": "skipped" }
  ]
}
```

- [x] **Step 5: Create lint-error/job-logs.json**

```json
{
  "job-202": "$ npm run lint\n\n> web-app@1.0.0 lint\n> eslint src/\n\n/home/project/src/components/SearchBar.tsx\n  3:10  error  'useState' is defined but never used  @typescript-eslint/no-unused-vars\n  4:10  error  'useCallback' is defined but never used  @typescript-eslint/no-unused-vars\n\n✖ 2 problems (2 errors, 0 warnings)\n\nProcess exited with code 1"
}
```

- [x] **Step 6: Create lint-error/test-results.json**

```json
{
  "job-202": [],
  "message": "No structured test results available for this job type (lint)."
}
```

- [x] **Step 7: Commit**

```bash
git add ci-fix/fixtures/
git commit -m "feat(ci-fix): add mock CI fixture data for test-failure and lint-error scenarios"
```

---

## Task 3: CI Tools

**Files:**
- Create: `ci-fix/tools/ci-tools.ts`
- Create: `ci-fix/tools/ci-tools.test.ts`

- [x] **Step 1: Write the failing test**

```ts
// ci-fix/tools/ci-tools.test.ts
import { describe, it, expect } from 'vitest';
import { createCiTools } from './ci-tools.ts';

describe('createCiTools', () => {
  const tools = createCiTools({ scenario: 'test-failure' });

  it('returns get_pipeline_status, get_job_logs, get_test_results tools', () => {
    expect(tools.get_pipeline_status).toBeDefined();
    expect(tools.get_job_logs).toBeDefined();
    expect(tools.get_test_results).toBeDefined();
  });

  describe('get_pipeline_status', () => {
    it('returns pipeline with failed test job', async () => {
      const result = await tools.get_pipeline_status.execute(
        { repo: 'acme/web-app', branch: 'feature/user-auth' },
        { toolCallId: 'test', messages: [], abortSignal: undefined as any }
      );
      expect(result.jobs).toHaveLength(3);
      expect(result.jobs.find((j: any) => j.name === 'test')?.status).toBe('failed');
    });
  });

  describe('get_job_logs', () => {
    it('returns logs for a valid job ID', async () => {
      const result = await tools.get_job_logs.execute(
        { jobId: 'job-103' },
        { toolCallId: 'test', messages: [], abortSignal: undefined as any }
      );
      expect(result.logs).toContain('AssertionError');
    });

    it('returns error for unknown job ID', async () => {
      const result = await tools.get_job_logs.execute(
        { jobId: 'job-999' },
        { toolCallId: 'test', messages: [], abortSignal: undefined as any }
      );
      expect(result.error).toBeDefined();
    });
  });

  describe('get_test_results', () => {
    it('returns structured test failures', async () => {
      const result = await tools.get_test_results.execute(
        { jobId: 'job-103' },
        { toolCallId: 'test', messages: [], abortSignal: undefined as any }
      );
      expect(result.results).toHaveLength(1);
      expect(result.results[0].file).toBe('src/utils/calc.test.ts');
    });

    it('returns empty array for non-test jobs', async () => {
      const lintTools = createCiTools({ scenario: 'lint-error' });
      const result = await lintTools.get_test_results.execute(
        { jobId: 'job-202' },
        { toolCallId: 'test', messages: [], abortSignal: undefined as any }
      );
      expect(result.results).toHaveLength(0);
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd ci-fix && pnpm test -- tools/ci-tools.test.ts`
Expected: FAIL — module not found

- [x] **Step 3: Implement createCiTools**

```ts
// ci-fix/tools/ci-tools.ts
import { tool } from 'ai';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture(scenario: string, file: string): any {
  const path = join(__dirname, '..', 'fixtures', scenario, file);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export function createCiTools({ scenario }: { scenario: string }) {
  const pipelineData = loadFixture(scenario, 'pipeline-status.json');
  const logsData = loadFixture(scenario, 'job-logs.json');
  const testData = loadFixture(scenario, 'test-results.json');

  return {
    get_pipeline_status: tool({
      description: 'Get the CI pipeline status for a repo and branch. Returns a list of jobs with their status (passed/failed/skipped) and job IDs.',
      parameters: z.object({
        repo: z.string().describe('GitHub org/repo identifier'),
        branch: z.string().describe('Branch name'),
      }),
      execute: async () => ({
        repo: pipelineData.repo,
        branch: pipelineData.branch,
        jobs: pipelineData.jobs,
      }),
    }),

    get_job_logs: tool({
      description: 'Get the raw log output for a specific CI job. Returns the build output truncated to the relevant failure section.',
      parameters: z.object({
        jobId: z.string().describe('The job ID from get_pipeline_status'),
      }),
      execute: async ({ jobId }) => {
        const logs = logsData[jobId];
        if (!logs) return { error: `No logs found for job ${jobId}` };
        return { logs };
      },
    }),

    get_test_results: tool({
      description: 'Get structured test results for a CI job. Returns an array of failures with file, test name, error, and stack trace. Returns empty array for non-test jobs.',
      parameters: z.object({
        jobId: z.string().describe('The job ID from get_pipeline_status'),
      }),
      execute: async ({ jobId }) => {
        const results = testData[jobId];
        if (!results) return { results: [], message: testData.message || `No test results for job ${jobId}` };
        return { results };
      },
    }),
  };
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `cd ci-fix && pnpm test -- tools/ci-tools.test.ts`
Expected: All tests PASS

- [x] **Step 5: Commit**

```bash
git add ci-fix/tools/ci-tools.ts ci-fix/tools/ci-tools.test.ts
git commit -m "feat(ci-fix): implement mock CI tools with fixture loading"
```

---

## Task 4: Docker Sandbox Lifecycle

**Files:**
- Create: `ci-fix/Dockerfile`
- Create: `ci-fix/sandbox.ts`
- Create: `ci-fix/sandbox.test.ts`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
FROM node:20-slim

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /home/project
```

- [ ] **Step 2: Build the Docker image**

Run: `cd ci-fix && docker build -t ci-fix-sandbox .`
Expected: Image builds successfully

- [ ] **Step 3: Write the failing test**

```ts
// ci-fix/sandbox.test.ts
import { describe, it, expect, afterAll } from 'vitest';
import { createSandbox, destroySandbox } from './sandbox.ts';

describe('sandbox', () => {
  let containerId: string;

  afterAll(async () => {
    if (containerId) await destroySandbox(containerId);
  });

  it('creates a running container and returns its ID', async () => {
    containerId = await createSandbox({ githubToken: 'fake-token' });
    expect(containerId).toBeTruthy();
    expect(containerId.length).toBeGreaterThan(10);
  }, 30_000);

  it('destroys the container', async () => {
    await destroySandbox(containerId);
    const { execSync } = await import('child_process');
    const result = execSync(`docker ps -q --filter id=${containerId}`, { encoding: 'utf-8' }).trim();
    expect(result).toBe('');
    containerId = '';
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd ci-fix && pnpm test -- sandbox.test.ts`
Expected: FAIL — module not found

- [ ] **Step 5: Implement sandbox.ts**

```ts
// ci-fix/sandbox.ts
import { execFile } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execFile);

export async function createSandbox({ githubToken }: { githubToken: string }): Promise<string> {
  const { stdout } = await exec('docker', [
    'run', '-d',
    '--env', `GITHUB_TOKEN=${githubToken}`,
    '--name', `ci-fix-${Date.now()}`,
    'ci-fix-sandbox',
    'sleep', 'infinity',
  ]);
  return stdout.trim();
}

export async function destroySandbox(containerId: string): Promise<void> {
  await exec('docker', ['rm', '-f', containerId]);
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd ci-fix && pnpm test -- sandbox.test.ts`
Expected: All tests PASS (requires Docker running)

- [ ] **Step 7: Commit**

```bash
git add ci-fix/Dockerfile ci-fix/sandbox.ts ci-fix/sandbox.test.ts
git commit -m "feat(ci-fix): implement Docker sandbox lifecycle (create/destroy)"
```

---

## Task 5: Sandbox Tools

**Files:**
- Create: `ci-fix/tools/sandbox-tools.ts`
- Create: `ci-fix/tools/sandbox-tools.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// ci-fix/tools/sandbox-tools.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSandbox, destroySandbox } from '../sandbox.ts';
import { createSandboxTools } from './sandbox-tools.ts';

describe('sandbox tools', () => {
  let containerId: string;
  let tools: ReturnType<typeof createSandboxTools>;
  const ctx = { toolCallId: 'test', messages: [], abortSignal: undefined as any };

  beforeAll(async () => {
    containerId = await createSandbox({ githubToken: 'fake' });
    tools = createSandboxTools({ containerId });
  }, 30_000);

  afterAll(async () => {
    if (containerId) await destroySandbox(containerId);
  });

  it('run_command executes a command and returns output', async () => {
    const result = await tools.run_command.execute({ command: 'echo hello' }, ctx);
    expect(result.stdout.trim()).toBe('hello');
    expect(result.exitCode).toBe(0);
  });

  it('write_file creates a file', async () => {
    const result = await tools.write_file.execute(
      { path: '/tmp/test.txt', content: 'hello world' }, ctx
    );
    expect(result.success).toBe(true);
  });

  it('read_file reads the file back', async () => {
    const result = await tools.read_file.execute({ path: '/tmp/test.txt' }, ctx);
    expect(result.content).toBe('hello world');
  });

  it('list_files lists directory contents', async () => {
    const result = await tools.list_files.execute({ path: '/tmp' }, ctx);
    expect(result.files).toContain('test.txt');
  });

  it('search_code finds patterns in files', async () => {
    await tools.run_command.execute(
      { command: 'mkdir -p /home/project/src && echo "const foo = 42;" > /home/project/src/index.ts' }, ctx
    );
    const result = await tools.search_code.execute(
      { pattern: 'foo', glob: '*.ts' }, ctx
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].line).toContain('foo');
  });
}, 60_000);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ci-fix && pnpm test -- tools/sandbox-tools.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement createSandboxTools**

```ts
// ci-fix/tools/sandbox-tools.ts
import { tool } from 'ai';
import { z } from 'zod';
import { execFile } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execFile);

async function dockerExec(containerId: string, command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await exec('docker', ['exec', containerId, 'sh', '-c', command]);
    return { stdout, stderr, exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout || '', stderr: err.stderr || '', exitCode: err.code || 1 };
  }
}

export function createSandboxTools({ containerId }: { containerId: string }) {
  return {
    read_file: tool({
      description: 'Read the contents of a file inside the sandbox.',
      parameters: z.object({
        path: z.string().describe('Absolute path to the file'),
      }),
      execute: async ({ path }) => {
        const result = await dockerExec(containerId, `cat "${path}"`);
        if (result.exitCode !== 0) return { error: result.stderr.trim() || `File not found: ${path}` };
        return { content: result.stdout };
      },
    }),

    write_file: tool({
      description: 'Write content to a file inside the sandbox. Creates parent directories if needed.',
      parameters: z.object({
        path: z.string().describe('Absolute path to the file'),
        content: z.string().describe('File content to write'),
      }),
      execute: async ({ path, content }) => {
        const dir = path.substring(0, path.lastIndexOf('/'));
        await dockerExec(containerId, `mkdir -p "${dir}"`);
        const b64 = Buffer.from(content).toString('base64');
        const result = await dockerExec(containerId, `echo "${b64}" | base64 -d > "${path}"`);
        if (result.exitCode !== 0) return { success: false, error: result.stderr.trim() };
        return { success: true };
      },
    }),

    search_code: tool({
      description: 'Search for a pattern in files inside the sandbox. Returns matching lines with file paths and line numbers.',
      parameters: z.object({
        pattern: z.string().describe('Search pattern (grep regex)'),
        glob: z.string().optional().describe('File glob to filter (e.g., "*.ts")'),
      }),
      execute: async ({ pattern, glob }) => {
        const includeFlag = glob ? `--include="${glob}"` : '';
        const result = await dockerExec(containerId, `grep -rn ${includeFlag} "${pattern}" /home/project/ 2>/dev/null || true`);
        const matches = result.stdout.trim().split('\n').filter(Boolean).map(line => {
          const [filePath, lineNum, ...rest] = line.split(':');
          return { file: filePath, lineNumber: parseInt(lineNum, 10), line: rest.join(':').trim() };
        });
        return { matches };
      },
    }),

    list_files: tool({
      description: 'List files in a directory inside the sandbox.',
      parameters: z.object({
        path: z.string().optional().describe('Directory path (defaults to /home/project)'),
      }),
      execute: async ({ path }) => {
        const dir = path || '/home/project';
        const result = await dockerExec(containerId, `ls -1 "${dir}"`);
        if (result.exitCode !== 0) return { error: result.stderr.trim() || `Directory not found: ${dir}` };
        return { files: result.stdout.trim().split('\n').filter(Boolean) };
      },
    }),

    run_command: tool({
      description: 'Run a shell command inside the sandbox. Returns stdout, stderr, and exit code.',
      parameters: z.object({
        command: z.string().describe('Shell command to execute'),
      }),
      execute: async ({ command }) => {
        return await dockerExec(containerId, command);
      },
    }),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ci-fix && pnpm test -- tools/sandbox-tools.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add ci-fix/tools/sandbox-tools.ts ci-fix/tools/sandbox-tools.test.ts
git commit -m "feat(ci-fix): implement Docker sandbox tools (read/write/search/list/run)"
```

---

## Task 6: GitHub Tools

**Files:**
- Create: `ci-fix/tools/github-tools.ts`
- Create: `ci-fix/tools/github-tools.test.ts`

- [ ] **Step 1: Inspect `@github-tools/sdk` API**

Run: `cd ci-fix && node -e "const m = require('@github-tools/sdk'); console.log(Object.keys(m));"` or check `node_modules/@github-tools/sdk/dist/index.d.ts` to confirm the actual export names (`createGithubTools`, tool names). Adapt the code in Step 3 to match.

- [ ] **Step 2: Write the failing test**

```ts
// ci-fix/tools/github-tools.test.ts
import { describe, it, expect } from 'vitest';
import { createGitHubTools } from './github-tools.ts';

describe('createGitHubTools', () => {
  it('returns the expected tools', () => {
    const tools = createGitHubTools({ token: 'fake-token', dryRun: false });
    expect(tools.listPullRequests).toBeDefined();
    expect(tools.createPullRequest).toBeDefined();
    expect(tools.addPullRequestComment).toBeDefined();
  });

  it('in dry-run mode, still returns tools (they log instead of executing)', () => {
    const tools = createGitHubTools({ token: 'fake-token', dryRun: true });
    expect(tools.createPullRequest).toBeDefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd ci-fix && pnpm test -- tools/github-tools.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement createGitHubTools**

Note: The exact implementation depends on the `@github-tools/sdk` API. Inspect the package after install and adapt. The structure below is the intended shape — adjust imports and API calls to match the actual SDK.

```ts
// ci-fix/tools/github-tools.ts
import { tool } from 'ai';
import { z } from 'zod';
import { createGithubTools as createSdkTools } from '@github-tools/sdk';

export function createGitHubTools({ token, dryRun }: { token: string; dryRun: boolean }) {
  if (dryRun) {
    return createDryRunTools();
  }

  const sdkTools = createSdkTools({ token });

  return {
    listPullRequests: sdkTools.listPullRequests,
    createPullRequest: sdkTools.createPullRequest,
    addPullRequestComment: sdkTools.addPullRequestComment,
  };
}

function createDryRunTools() {
  return {
    listPullRequests: tool({
      description: 'List pull requests for a repository.',
      parameters: z.object({
        owner: z.string(),
        repo: z.string(),
        state: z.enum(['open', 'closed', 'all']).optional(),
      }),
      execute: async (params) => {
        console.log('[DRY RUN] listPullRequests:', params);
        return { pullRequests: [] };
      },
    }),

    createPullRequest: tool({
      description: 'Create a pull request.',
      parameters: z.object({
        owner: z.string(),
        repo: z.string(),
        title: z.string(),
        body: z.string(),
        head: z.string(),
        base: z.string(),
      }),
      execute: async (params) => {
        console.log('[DRY RUN] Would create PR:', params.title);
        console.log('[DRY RUN]   head:', params.head, '→ base:', params.base);
        return { url: 'https://github.com/dry-run/pr/1', number: 0 };
      },
    }),

    addPullRequestComment: tool({
      description: 'Add a comment to a pull request.',
      parameters: z.object({
        owner: z.string(),
        repo: z.string(),
        pullRequestNumber: z.number(),
        body: z.string(),
      }),
      execute: async (params) => {
        console.log('[DRY RUN] Would comment on PR #', params.pullRequestNumber);
        console.log('[DRY RUN]   body:', params.body.substring(0, 100) + '...');
        return { url: 'https://github.com/dry-run/comment/1' };
      },
    }),
  };
}
```

**Important:** After `pnpm install`, check the actual `@github-tools/sdk` exports. The `createGithubTools` function and tool names may differ. Read the package's types or README to confirm. Adapt the cherry-pick accordingly.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd ci-fix && pnpm test -- tools/github-tools.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add ci-fix/tools/github-tools.ts ci-fix/tools/github-tools.test.ts
git commit -m "feat(ci-fix): implement GitHub tools with dry-run support"
```

---

## Task 7: System Prompt

**Files:**
- Create: `ci-fix/system-prompt.ts`

- [ ] **Step 1: Create system-prompt.ts**

```ts
// ci-fix/system-prompt.ts
export const SYSTEM_PROMPT = `You are an autonomous CI fix agent. Your goal is to diagnose a failed CI build and submit a fix as a pull request.

## Workflow

Follow these steps in order:

### 1. Diagnose
- Call get_pipeline_status to see which jobs failed.
- For each failed job, call get_job_logs to read the build output.
- If the failed job is a test job, also call get_test_results for structured failure data.
- Identify the root cause: what failed and why.

### 2. Locate
- Use read_file and search_code to find the relevant source code.
- Understand the code context around the failure.

### 3. Fix
- Apply the MINIMAL change that fixes the issue.
- Use write_file to make the change.
- Do NOT refactor, rename, reorganize, or "improve" unrelated code.
- One focused fix only.

### 4. Validate
- Run the exact command that failed in CI (e.g., "npm test", "npm run lint") using run_command.
- If the command still fails, read the new error output, adjust your fix, and try again.
- You have at most 3 validation attempts. If you cannot fix it after 3 tries, stop and report what you tried.

### 5. Submit
- Create a new branch from the current branch: git checkout -b ci-fix/<short-description>
- Commit your changes with a clear message explaining the fix.
- Push the branch.
- Call createPullRequest to open a PR against the original branch.
  - PR title: "fix: <concise description of what was fixed>"
  - PR body: Include root cause analysis and what was changed.
- If an existing PR exists for this branch (check with listPullRequests), call addPullRequestComment with a summary of what failed and how it was fixed.

## Rules
- Always explain the root cause — don't just fix the symptom.
- Make minimal changes. The diff should be as small as possible.
- Never modify test files to make tests pass (unless the test itself is the bug — this is rare).
- If you cannot determine the root cause, say so and stop. Do not guess.
`;
```

- [ ] **Step 2: Commit**

```bash
git add ci-fix/system-prompt.ts
git commit -m "feat(ci-fix): add agent system prompt"
```

---

## Task 8: Agent Loop

**Files:**
- Create: `ci-fix/agent.ts`
- Create: `ci-fix/agent.test.ts`

- [ ] **Step 1: Create agent.ts**

```ts
// ci-fix/agent.ts
import { gateway, streamText } from 'ai';
import { SYSTEM_PROMPT } from './system-prompt.ts';

interface AgentConfig {
  model: string;
  tools: Record<string, any>;
  repo: string;
  branch: string;
}

export async function runAgent({ model, tools, repo, branch }: AgentConfig): Promise<void> {
  const initialMessage = `A CI build has failed for the repository "${repo}" on branch "${branch}". Please diagnose the failure and fix it.`;

  const result = streamText({
    model: gateway(model),
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: initialMessage }],
    tools,
    maxSteps: 25,
  });

  for await (const event of result.textStream) {
    process.stdout.write(event);
  }

  console.log('\n');
}
```

- [ ] **Step 2: Write a structural test for agent.ts**

```ts
// ci-fix/agent.test.ts
import { describe, it, expect, vi } from 'vitest';

// Verify the module exports the expected function with the right shape
describe('agent', () => {
  it('exports runAgent as an async function', async () => {
    const { runAgent } = await import('./agent.ts');
    expect(typeof runAgent).toBe('function');
  });
});
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd ci-fix && pnpm test -- agent.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add ci-fix/agent.ts ci-fix/agent.test.ts
git commit -m "feat(ci-fix): implement agent loop with streamText"
```

---

## Task 9: CLI Entry Point

**Files:**
- Create: `ci-fix/index.ts`

- [ ] **Step 1: Create index.ts**

```ts
// ci-fix/index.ts
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';
import { createCiTools } from './tools/ci-tools.ts';
import { createSandboxTools } from './tools/sandbox-tools.ts';
import { createGitHubTools } from './tools/github-tools.ts';
import { createSandbox, destroySandbox } from './sandbox.ts';
import { runAgent } from './agent.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

config();

// --- Parse CLI args ---
const { values } = parseArgs({
  options: {
    repo: { type: 'string' },
    branch: { type: 'string' },
    build: { type: 'string' },
    scenario: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
});

const repo = values.repo;
const branch = values.branch;
const scenario = values.scenario;
const dryRun = values['dry-run'] ?? false;
const model = process.env.MODEL || 'anthropic:claude-sonnet-4-20250514';

// --- Validate args ---
if (!repo || !branch) {
  console.error(`${c.red}Usage: tsx index.ts --repo org/repo --branch branch-name [--scenario test-failure] [--dry-run]${c.reset}`);
  process.exit(1);
}

if (!scenario && !values.build) {
  console.error(`${c.red}Either --scenario or --build is required.${c.reset}`);
  process.exit(1);
}

// --- Validate scenario fixtures exist ---
if (scenario) {
  const fixtureDir = join(__dirname, 'fixtures', scenario);
  if (!existsSync(fixtureDir)) {
    const available = ['test-failure', 'lint-error'];
    console.error(`${c.red}Scenario "${scenario}" not found. Available: ${available.join(', ')}${c.reset}`);
    process.exit(1);
  }
}

// --- Preflight checks ---
function checkDocker(): boolean {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!checkDocker()) {
  console.error(`${c.red}Docker is not running. Please start Docker and try again.${c.reset}`);
  process.exit(1);
}

const aiGatewayKey = process.env.AI_GATEWAY_API_KEY;
if (!aiGatewayKey) {
  console.error(`${c.red}AI_GATEWAY_API_KEY environment variable is required.${c.reset}`);
  process.exit(1);
}

const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken) {
  console.error(`${c.red}GITHUB_TOKEN environment variable is required.${c.reset}`);
  process.exit(1);
}

// --- Main ---
async function main() {
  console.log(`\n${c.bold}CI Fix Agent${c.reset} ${c.dim}— autonomous CI failure diagnosis and repair${c.reset}\n`);
  console.log(`${c.cyan}Repo:${c.reset}     ${repo}`);
  console.log(`${c.cyan}Branch:${c.reset}   ${branch}`);
  console.log(`${c.cyan}Scenario:${c.reset} ${scenario || 'live'}`);
  console.log(`${c.cyan}Dry run:${c.reset}  ${dryRun}`);
  console.log(`${c.cyan}Model:${c.reset}    ${model}\n`);

  // 1. Start sandbox
  console.log(`${c.dim}Starting Docker sandbox...${c.reset}`);
  const containerId = await createSandbox({ githubToken });
  console.log(`${c.dim}Sandbox ready: ${containerId.substring(0, 12)}${c.reset}\n`);

  // Handle SIGINT cleanup
  const cleanup = async () => {
    console.log(`\n${c.dim}Tearing down sandbox...${c.reset}`);
    await destroySandbox(containerId);
    process.exit(0);
  };
  process.on('SIGINT', cleanup);

  try {
    // 2. Build tools
    const tools = {
      ...(scenario ? createCiTools({ scenario }) : {}),
      ...createSandboxTools({ containerId }),
      ...createGitHubTools({ token: githubToken, dryRun }),
    };

    // 3. Run agent
    await runAgent({ model, tools, repo, branch });

    console.log(`${c.green}${c.bold}Agent complete.${c.reset}`);
  } finally {
    // 4. Tear down sandbox
    console.log(`${c.dim}Tearing down sandbox...${c.reset}`);
    await destroySandbox(containerId);
  }
}

main().catch((err) => {
  console.error(`${c.red}Fatal: ${err.message}${c.reset}`);
  process.exit(1);
});
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd ci-fix && pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add ci-fix/index.ts
git commit -m "feat(ci-fix): implement CLI entry point with preflight checks and SIGINT cleanup"
```

---

## Task 10: End-to-End Smoke Test

- [ ] **Step 1: Create .env file**

```bash
cd ci-fix
cp ../.env.example .env
# Add your AI_GATEWAY_API_KEY and GITHUB_TOKEN
```

- [ ] **Step 2: Run with dry-run and test-failure scenario**

Run: `cd ci-fix && npx tsx index.ts --repo acme/web-app --branch feature/user-auth --scenario test-failure --dry-run`

Expected: Agent streams its reasoning, calls CI tools to diagnose, uses sandbox tools to read/fix code, calls `[DRY RUN]` GitHub tools. No real PR created.

- [ ] **Step 3: Run with dry-run and lint-error scenario**

Run: `cd ci-fix && npx tsx index.ts --repo acme/web-app --branch feature/search --scenario lint-error --dry-run`

Expected: Agent diagnoses lint errors and proposes fixes. Dry run output.

- [ ] **Step 4: Fix any issues discovered during smoke testing**

Iterate on any problems found — adjust system prompt, tool implementations, or fixture data as needed.

- [ ] **Step 5: Commit any fixes**

Stage only the changed source files (not `.env`):

```bash
git add ci-fix/index.ts ci-fix/agent.ts ci-fix/system-prompt.ts ci-fix/tools/ ci-fix/fixtures/ ci-fix/sandbox.ts
git commit -m "fix(ci-fix): address issues from smoke testing"
```

---

## Task 11: README

**Files:**
- Create: `ci-fix/README.md`

- [ ] **Step 1: Write README.md**

Cover: overview, how it works, architecture diagram, usage instructions, environment variables, demo scenarios, evolution path.

Follow the existing PoC README pattern from `data-analyst/README.md` or `git-assistant/README.md`.

- [ ] **Step 2: Commit**

```bash
git add ci-fix/README.md
git commit -m "docs(ci-fix): add README"
```
