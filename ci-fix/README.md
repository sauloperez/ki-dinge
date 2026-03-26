# CI Fix Agent

Autonomous agent that diagnoses failed CI builds and submits fix PRs, running code changes inside a Docker sandbox.

## How it works

The agent uses the Vercel AI SDK (`streamText` + tools) to drive an agentic loop with three tool groups:

1. **CI Tools** — mock-backed tools that return pipeline status, job logs, and structured test results from fixture data
2. **Sandbox Tools** — Docker exec-based tools for reading/writing files, searching code, and running commands inside an isolated container
3. **GitHub Tools** — cherry-picked from `@github-tools/sdk` for creating PRs and adding comments (with a dry-run mode that logs instead of hitting the API)

The agent follows a 5-step workflow:

1. **Diagnose** — inspect pipeline status and job logs to identify the root cause
2. **Locate** — search and read source code in the sandbox
3. **Fix** — apply the minimal change that resolves the issue
4. **Validate** — re-run the failed CI command to confirm the fix works
5. **Submit** — create a branch, commit, push, and open a PR

## Prerequisites

- Node.js + pnpm
- Docker (running)
- `AI_GATEWAY_API_KEY` for the Vercel AI Gateway
- `GITHUB_TOKEN` for PR creation (or use `--dry-run`)

## Usage

```bash
cp .env.example .env   # add your AI_GATEWAY_API_KEY and GITHUB_TOKEN
pnpm install
docker build -t ci-fix-sandbox .
```

### Run with a mock scenario

```bash
# Test failure scenario
pnpm start -- --repo acme/web-app --branch feature/user-auth --scenario test-failure --dry-run

# Lint error scenario
pnpm start -- --repo acme/web-app --branch feature/search --scenario lint-error --dry-run
```

### CLI flags

| Flag | Description |
|------|-------------|
| `--repo` | GitHub org/repo (required) |
| `--branch` | Branch name (required) |
| `--scenario` | Mock scenario: `test-failure` or `lint-error` |
| `--build` | Live CI build ID (not yet implemented) |
| `--dry-run` | Log GitHub actions instead of executing them |

### Environment variables

| Variable | Description |
|----------|-------------|
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway API key |
| `GITHUB_TOKEN` | GitHub personal access token |
| `MODEL` | AI model identifier (default: `anthropic:claude-sonnet-4-20250514`) |

## Demo scenarios

Two fixture-based scenarios are included:

- **test-failure** — a Vitest test fails because `calculateDiscount` returns 95 instead of 90. The agent reads the test output, locates the bug in the source, fixes the discount calculation, validates, and opens a PR.
- **lint-error** — ESLint reports unused imports (`useState`, `useCallback`) in a React component. The agent removes the unused imports, re-runs the linter, and opens a PR.

## Evolution path

This PoC uses mock fixtures. Future iterations could:

- Connect to real CircleCI/GitHub Actions APIs for live build data
- Clone the actual repo into the sandbox instead of using mock files
- Add support for more failure types (type errors, build failures, security vulnerabilities)
