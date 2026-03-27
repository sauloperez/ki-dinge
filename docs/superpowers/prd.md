# CI Fix Agent — Product Requirements & Progress Tracker

Date: 2026-03-26
Status: In Progress

## Overview

An autonomous AI agent that diagnoses and fixes CI failures from CircleCI for any internal project. This is a PoC for internal use at JOIN that showcases autonomous agent behavior in a sandboxed environment.

## Objectives

- [ ] Build CLI tool that accepts repo, branch, and scenario flags
- [ ] Implement agent loop using Vercel AI SDK with tool-based architecture
- [ ] Create mock CI backend for reliable demos
- [ ] Implement Docker sandbox for isolated code execution
- [ ] Integrate GitHub operations for PR creation and commenting
- [ ] Support two demo scenarios: test failures and lint errors

## Features

### Core Functionality

- [ ] **CLI Interface** (`index.ts`)
  - [ ] Parse command-line arguments (--repo, --branch, --build, --scenario, --dry-run)
  - [ ] Validate required arguments
  - [ ] Check for Docker daemon availability at startup
  - [ ] Check for required environment variables (AI_GATEWAY_API_KEY, GITHUB_TOKEN)
  - [ ] Stream agent output to stdout
  - [ ] Handle teardown on completion or error

- [ ] **Agent Loop** (Vercel AI SDK integration)
  - [ ] Configure streamText with system prompt and tools
  - [ ] Set maxSteps: 25 safety limit
  - [ ] Integrate all three tool groups (CI, Sandbox, GitHub)
  - [ ] Handle agent reasoning flow: diagnose → locate → fix → validate → submit
  - [ ] Stop after 3 failed validation attempts with summary output

### Tool Groups

- [ ] **CI Tools** (`tools/ci-tools.ts`)
  - [ ] `get_pipeline_status(repo, branch)` — returns job status list
  - [ ] `get_job_logs(jobId)` — returns truncated log output
  - [ ] `get_test_results(jobId)` — returns structured test failures
  - [ ] Mock backend loading from fixtures directory
  - [ ] Scenario selection logic (--scenario flag support)

- [ ] **Sandbox Tools** (`tools/sandbox-tools.ts`)
  - [ ] `read_file(path)` — read files inside container
  - [ ] `write_file(path, content)` — write files inside container
  - [ ] `search_code(pattern, glob?)` — search for patterns in code
  - [ ] `list_files(path?)` — list directory contents
  - [ ] `run_command(command)` — execute commands in container
  - [ ] All operations via `docker exec`

- [ ] **GitHub Tools** (`tools/github-tools.ts`)
  - [ ] Configure @github-tools/sdk with PAT auth
  - [ ] `listPullRequests` — find existing PR for branch
  - [ ] `createPullRequest` — open fix PR
  - [ ] `addPullRequestComment` — comment on original PR
  - [ ] Respect --dry-run flag (print operations instead of executing)

### Docker Sandbox

- [ ] **Container Lifecycle** (`sandbox.ts`)
  - [ ] Create container from base image
  - [ ] Return container ID for tool operations
  - [ ] Destroy container on completion
  - [ ] Handle container failures gracefully

- [ ] **Base Image** (`Dockerfile`)
  - [ ] Base: node:20-slim
  - [ ] Install git
  - [ ] Keep minimal for PoC
  - [ ] Document production requirements

- [ ] **Secret Handling**
  - [ ] MVP: Pass GITHUB_TOKEN as env var to container
  - [ ] Document v1.1 credential proxy improvement plan

### System Prompt

- [ ] **Workflow Instructions** (`system-prompt.ts`)
  - [ ] Diagnose: fetch status → logs → test results
  - [ ] Locate: read relevant files, search for context
  - [ ] Fix: apply minimal change
  - [ ] Validate: run failing command in sandbox
  - [ ] Submit: create branch, open PR, comment on original PR

- [ ] **Constraints**
  - [ ] Make minimal changes only
  - [ ] Stop after 3 validation attempts
  - [ ] Always explain root cause in PR description

### Demo Scenarios

- [ ] **Scenario A — Test Failure** (`fixtures/test-failure/`)
  - [ ] Create pipeline status fixture
  - [ ] Create job logs fixture (npm test output)
  - [ ] Create test results fixture (structured failures)
  - [ ] Document expected behavior

- [ ] **Scenario B — Lint Error** (`fixtures/lint-error/`)
  - [ ] Create pipeline status fixture
  - [ ] Create job logs fixture (eslint output)
  - [ ] Create empty test results (with message)
  - [ ] Document expected behavior

### Error Handling

- [ ] Docker daemon not running → clear error message, exit
- [ ] Missing/invalid GITHUB_TOKEN → detect on startup, exit
- [ ] Missing AI_GATEWAY_API_KEY → detect on startup, exit
- [ ] Container crashes → report error, teardown, no retry
- [ ] LLM errors → rely on Vercel AI SDK retry, exit on failure
- [ ] Validation loop exceeds 3 attempts → stop, output summary, no PR
- [ ] Nonexistent scenario → list available scenarios, exit

### Documentation

- [ ] **README.md**
  - [ ] Overview and purpose
  - [ ] Installation instructions
  - [ ] Usage examples for each flag combination
  - [ ] Environment variable setup
  - [ ] Demo scenario walkthroughs
  - [ ] Architecture diagram
  - [ ] Troubleshooting section

### Testing

- [ ] **Vitest Setup**
  - [ ] Configure test environment
  - [ ] Mock Docker operations
  - [ ] Mock GitHub API calls
  - [ ] Test CI tools with fixtures

- [ ] **Unit Tests**
  - [ ] CI tools fixture loading
  - [ ] Sandbox tool Docker exec calls
  - [ ] GitHub tools auth and API calls
  - [ ] CLI argument parsing
  - [ ] Error handling paths

- [ ] **Integration Tests**
  - [ ] End-to-end scenario A (test failure)
  - [ ] End-to-end scenario B (lint error)
  - [ ] Dry-run mode validation

## File Structure Checklist

- [ ] `ci-fix/index.ts` — CLI entry + agent loop
- [ ] `ci-fix/tools/ci-tools.ts` — CI tool implementations
- [ ] `ci-fix/tools/sandbox-tools.ts` — Sandbox tool implementations
- [ ] `ci-fix/tools/github-tools.ts` — GitHub tool setup
- [ ] `ci-fix/sandbox.ts` — Docker lifecycle management
- [ ] `ci-fix/system-prompt.ts` — Agent instructions
- [ ] `ci-fix/Dockerfile` — Base sandbox image
- [ ] `ci-fix/fixtures/test-failure/` — Scenario A data
- [ ] `ci-fix/fixtures/lint-error/` — Scenario B data
- [ ] `ci-fix/package.json` — Dependencies and scripts
- [ ] `ci-fix/tsconfig.json` — TypeScript config
- [ ] `ci-fix/README.md` — Documentation
- [ ] `ci-fix/tests/` — Test files

## Dependencies

### Required Packages
- [ ] `ai` — Vercel AI SDK
- [ ] `@ai-sdk/anthropic` — Anthropic provider for AI SDK
- [ ] `@github-tools/sdk` — GitHub operations
- [ ] `tsx` — TypeScript execution
- [ ] `vitest` — Testing framework

## Environment Setup

- [ ] AI_GATEWAY_API_KEY configured
- [ ] GITHUB_TOKEN configured with repo + PR permissions
- [ ] MODEL (optional, default: anthropic:claude-sonnet-4-20250514)
- [ ] Docker daemon running

## Success Criteria

- [ ] CLI accepts all documented flags correctly
- [ ] Agent successfully diagnoses and fixes test failure scenario
- [ ] Agent successfully diagnoses and fixes lint error scenario
- [ ] Docker sandbox isolates all operations
- [ ] GitHub PR created with clear explanation
- [ ] --dry-run mode works without GitHub writes
- [ ] Error handling prevents crashes for all documented error cases
- [ ] All tests pass
- [ ] README provides clear demo walkthrough

## Out of Scope (PoC)

- Build/compilation failures
- Infrastructure/flaky failures
- CircleCI config issues
- Monorepo support
- Private npm registries in sandbox
- Web UI
- Persistent state across runs

## Evolution Path

| Phase | Status | Focus |
|-------|--------|-------|
| **MVP** | 🔄 In Progress | Mock fixtures, Docker + env secrets, basic agent loop |
| **v1.1** | 📋 Planned | Credential proxy for secret isolation |
| **v2** | 📋 Planned | CircleCI MCP server, pi-agent-core runtime |
