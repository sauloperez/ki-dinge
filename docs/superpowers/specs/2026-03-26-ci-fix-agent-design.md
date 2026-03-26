# CI Fix Agent — Design Spec

An autonomous AI agent that diagnoses and fixes CI failures from CircleCI for any internal project.

## Overview

`ci-fix` is a CLI-invoked agent that takes a GitHub repo and branch, fetches the failed CircleCI build output, diagnoses the root cause, applies a fix inside a Docker sandbox, validates it, and submits a PR with an explanation.

This is a PoC intended for internal use at JOIN. It showcases an autonomous agent running in a constrained cloud-like environment, dealing with realistic production concerns (sandboxing, secret isolation, tool abstraction) while using mock CI data for reliable demos.

### Invocation

```bash
npx tsx ci-fix/index.ts --repo org/repo --branch feature-branch [--build 1234]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--repo` | Yes | GitHub org/repo identifier |
| `--branch` | Yes | Branch with the failing CI |
| `--build` | No | Specific CircleCI build number. If omitted, fetches the latest failed build for the branch. |

### What it does

1. Fetches CI status and failed job logs
2. Classifies the failure (test failure, lint error, build error, infra/flaky)
3. Clones the repo into a Docker sandbox
4. Runs an agent loop: reads relevant code, generates a fix, validates it locally inside the container
5. Opens a PR against the failing branch with the fix
6. Comments on the original PR (if one exists) explaining what failed and how it was fixed

### Scope

**In scope for PoC**:
- Test failures (wrong return value, missing edge case, assertion errors)
- Lint/type errors (unused imports, missing type annotations, ESLint rule violations)

**Acknowledged, out of scope for PoC**:
- Build/compilation failures
- Infrastructure/flaky failures (timeouts, network errors)
- CircleCI config issues

## Architecture

Single-loop agent using Vercel AI SDK's `streamText`. All capabilities are exposed as tools organized in three groups: CI tools (mock-backed), sandbox tools (Docker), and GitHub tools (via `@github-tools/sdk`).

```
CLI (index.ts)
  │
  ▼
Agent Loop (Vercel AI SDK streamText)
  │
  ├── CI Tools ──────► Mock fixtures (JSON)
  │                     └── [future: CircleCI MCP server]
  │
  ├── Sandbox Tools ──► Docker container
  │   ├── read_file        (repo clone inside)
  │   ├── write_file
  │   ├── search_code
  │   ├── list_files
  │   └── run_command
  │
  └── GitHub Tools ──► @github-tools/sdk (PAT auth)
      ├── getFileContent
      ├── listPullRequests
      ├── createPullRequest
      ├── addPullRequestComment
      └── createOrUpdateFile
```

The agent loop combines all tools:

```ts
const result = streamText({
  model: gateway('anthropic:claude-sonnet-4-20250514'),
  system: SYSTEM_PROMPT,
  messages,
  tools: {
    ...createCiTools({ scenario }),
    ...createSandboxTools({ containerId }),
    ...githubTools,
  },
  maxSteps: 25,
});
```

## Tools

### CI Tools — `createCiTools()`

Mock-backed tools returning fixture data. Same interface that a future CircleCI MCP integration would provide.

| Tool | Params | Returns |
|------|--------|---------|
| `get_pipeline_status` | `repo`, `branch` | List of jobs with status (passed/failed) and job IDs |
| `get_job_logs` | `jobId` | Raw log output (truncated to relevant failure section) |
| `get_test_results` | `jobId` | Structured array: `{ file, testName, error, stackTrace }` |

### Sandbox Tools — `createSandboxTools()`

Execute inside the Docker container via `docker exec`.

| Tool | Params | Returns |
|------|--------|---------|
| `read_file` | `path` | File contents |
| `write_file` | `path`, `content` | Success/failure |
| `search_code` | `pattern`, `glob?` | Matching lines with file paths and line numbers |
| `list_files` | `path?` | Directory listing |
| `run_command` | `command` | stdout + stderr + exit code |

### GitHub Tools — `@github-tools/sdk`

Cherry-picked from [vercel-labs/github-tools](https://github.com/vercel-labs/github-tools). Configured in `tools/github-tools.ts` with PAT auth.

Tools used:
- `getFileContent` — read repo files
- `listPullRequests` — find existing PR for a branch
- `createPullRequest` — open fix PRs
- `addPullRequestComment` — comment on original PR
- `createOrUpdateFile` — commit file changes

## Docker Sandbox

The agent clones and modifies code inside an isolated Docker container.

### Lifecycle

1. CLI starts → spins up a container from the base image
2. Agent clones the repo inside the container via `run_command`
3. Agent reads, writes, searches files — all via sandbox tools
4. Agent runs lint/test commands inside the container to validate fixes
5. Agent pushes the fix branch from inside the container
6. CLI tears down the container when done

### Base Image

A `Dockerfile` shipping with the PoC, based on `node:20-slim` with `git` installed. Sufficient for the test and lint demo scenarios. Production would need per-project images with appropriate runtimes and dependencies.

### Secret Handling

**MVP**: GitHub token passed as env var to the container. Gets the agent running.

**Planned improvement (v1.1)**: Credential proxy on the host. The container has no secrets in its environment or filesystem. A small HTTP proxy running on the host intercepts GitHub traffic from the container and injects auth headers. Git inside the container is configured to route through this proxy.

## Agent Loop & System Prompt

The system prompt instructs the agent with a clear workflow:

1. **Diagnose**: Fetch pipeline status → get logs for failed jobs → get structured test results if available
2. **Locate**: Read relevant source files, search for related code
3. **Fix**: Apply the minimal change that fixes the issue
4. **Validate**: Run the same command that failed in CI inside the sandbox. If still fails, iterate.
5. **Submit**: Create a fix branch, open a PR, comment on the original PR with a summary

### Constraints

- Make minimal changes — don't refactor unrelated code
- If validation fails after 3 attempts, stop and report what was tried
- Always explain the root cause in the PR description and comment
- `maxSteps: 25` as a safety cap on the agent loop

### Output

The CLI streams the agent's reasoning to stdout so the person demoing can narrate what's happening in real time.

## Demo Scenarios

The mock CI backend ships with two fixture scenarios:

### Scenario A — Test Failure

A unit test fails because a function returns the wrong value (e.g., off-by-one error).

- `get_pipeline_status` → `test` job failed
- `get_job_logs` → npm test output with assertion error
- `get_test_results` → structured failure with file, test name, expected vs actual
- Agent reads source, identifies the bug, fixes it, runs `npm test` in sandbox to confirm

### Scenario B — Lint Error

ESLint fails (e.g., unused import, missing type annotation).

- `get_pipeline_status` → `lint` job failed
- `get_job_logs` → eslint output with file, line, rule
- Agent reads the file, applies the fix, runs `npm run lint` in sandbox to confirm

Each scenario is a directory under `fixtures/` with JSON files for each tool response.

## File Structure

```
ci-fix/
├── index.ts                 — CLI entry + agent loop
├── tools/
│   ├── ci-tools.ts          — createCiTools()
│   ├── sandbox-tools.ts     — createSandboxTools()
│   └── github-tools.ts      — cherry-picked setup from @github-tools/sdk
├── sandbox.ts               — Docker container lifecycle (create/destroy)
├── system-prompt.ts         — agent system prompt
├── Dockerfile               — base sandbox image
├── fixtures/
│   ├── test-failure/        — scenario A data
│   └── lint-error/          — scenario B data
├── package.json
└── tsconfig.json
```

## Tech Stack

- **Runtime**: TypeScript via `tsx`
- **Agent framework**: Vercel AI SDK (`streamText`, tools)
- **LLM**: Via Vercel AI Gateway (configurable model, default Claude Sonnet)
- **GitHub**: `@github-tools/sdk` (cherry-picked tools, PAT auth)
- **Sandbox**: Docker (`node:20-slim` + git)
- **Testing**: Vitest

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_GATEWAY_API_KEY` | Yes | Vercel AI Gateway API key |
| `MODEL` | No | Model identifier (default: `anthropic:claude-sonnet-4-20250514`) |
| `GITHUB_TOKEN` | Yes | GitHub PAT with repo + PR permissions |

## Evolution Path

| Phase | Runtime | CI Backend | Sandbox | GitHub |
|-------|---------|-----------|---------|--------|
| **MVP** | Vercel AI SDK | Mock fixtures | Docker + secrets in env | `@github-tools/sdk` |
| **v1.1** | Vercel AI SDK | Mock fixtures | Docker + credential proxy | `@github-tools/sdk` |
| **v2** | pi-agent-core | CircleCI MCP server | Docker + credential proxy | `@github-tools/sdk` |
