# CI Fix Agent

Autonomous agent that diagnoses failed CI builds and submits fix PRs, running code changes inside a Docker sandbox.

## How it works

The agent uses the Vercel AI SDK (`streamText` + tools) to drive an agentic loop with three tool groups:

1. **CI Tools** — mock-backed tools that return pipeline status, job logs, and structured test results from fixture data
2. **Sandbox Tools** — Docker exec-based tools for reading/writing files, searching code, and running commands inside an isolated container
3. **GitHub Tools** — tools from `@github-tools/sdk` for creating real PRs and adding comments on GitHub

The agent follows a 5-step workflow:

1. **Diagnose** — inspect pipeline status and job logs to identify the root cause
2. **Locate** — search and read source code in the sandbox
3. **Fix** — apply the minimal change that resolves the issue
4. **Validate** — re-run the failed CI command to confirm the fix works
5. **Submit** — create a branch, commit, push, and open a PR

## Prerequisites

- Node.js + pnpm
- Docker (running)
- `AI_GATEWAY_API_KEY` for OpenRouter API access
- `GITHUB_TOKEN` for creating real PRs on GitHub
- Test repository: [sauloperez/ci-fix-test-repo](https://github.com/sauloperez/ci-fix-test-repo)

## Usage

```bash
cp .env.example .env   # add your AI_GATEWAY_API_KEY and GITHUB_TOKEN
pnpm install
docker build -t ci-fix-sandbox .
```

### Run with a mock scenario

**⚠️ WARNING: These commands will create REAL pull requests on the specified repository.**

```bash
# Test failure scenario - creates real PR on GitHub
pnpm start -- --repo sauloperez/ci-fix-test-repo --branch main --scenario test-failure

# Lint error scenario - creates real PR on GitHub
pnpm start -- --repo sauloperez/ci-fix-test-repo --branch main --scenario lint-error
```

Each run creates a new branch with a timestamped name (e.g., `ci-fix/test-failure-1711234567`) and opens a real PR against the target branch.

### CLI flags

| Flag | Description |
|------|-------------|
| `--repo` | GitHub org/repo (required) - e.g., `sauloperez/ci-fix-test-repo` |
| `--branch` | Branch name (required) - target branch for PRs, usually `main` |
| `--scenario` | Mock scenario: `test-failure` or `lint-error` (required for now) |
| `--build` | Live CI build ID (not yet implemented) |

### Environment variables

| Variable | Description |
|----------|-------------|
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway API key |
| `GITHUB_TOKEN` | GitHub personal access token |
| `MODEL` | AI model identifier (default: `anthropic:claude-sonnet-4-20250514`) |

## Demo scenarios

Two fixture-based scenarios are included, running against the [test repository](https://github.com/sauloperez/ci-fix-test-repo):

- **test-failure** — a Vitest test fails because `calculateDiscount` returns 95 instead of 90. The agent reads the test output, locates the bug in the source, fixes the discount calculation, validates, and creates a real PR on GitHub.
- **lint-error** — ESLint reports unused imports (`useState`, `useCallback`) in a React component. The agent removes the unused imports, re-runs the linter, and creates a real PR on GitHub.

The test repository contains both bugs intentionally. Each agent run will:
1. Fix the code in the Docker sandbox
2. Create a new branch with timestamp (e.g., `ci-fix/test-failure-1711234567`)
3. Push the fix to GitHub
4. Open a real pull request showing the changes

## Current Status & Next Iterations

**✅ Iteration 1 Complete:** Real GitHub integration
- Agent now creates real PRs on GitHub (no more dry-run mode)
- Test repository available at [sauloperez/ci-fix-test-repo](https://github.com/sauloperez/ci-fix-test-repo)
- Still uses mock CI data from fixtures

**🚧 Next: Iteration 2** - Real CircleCI integration via MCP
- Replace mock CI tools with CircleCI MCP server
- Clone real repos into sandbox
- Diagnose and fix real CircleCI build failures
- Research notes: `docs/circleci-mcp-research.md`

**Future iterations:**
- Add support for more failure types (type errors, build failures, security vulnerabilities)
- Multi-repo support
- Web UI for monitoring runs
