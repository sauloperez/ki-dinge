# AI Agent Demo Roadmap — JOIN Internal

Date: 2026-03-20

## Goal

Showcase the power of AI agents through real JOIN use cases, while progressively exploring new SDKs, agentic patterns, and platforms.

**Primary audience:** JOIN engineering team (internal buy-in)
**Secondary:** Personal learning — each demo introduces a new SDK, platform, or agentic pattern

## Context

JOIN is a SaaS recruitment platform. These demos are built as self-contained PoCs in the `ki-dinge` monorepo. Each one targets a real team workflow and is designed to generate a visible "wow" moment before tackling the next level of complexity.

Existing PoCs already cover: raw streaming (Ollama), parametrized prompts, tool calling loops, RAG (LlamaIndex), multi-tool agents (OpenRouter SDK), and REPL agents (Vercel AI SDK + AI Gateway). Each new demo should introduce something not yet explored.

## Roadmap

The arc progresses from simple scheduled delivery to full org-wide platform infrastructure. Visibility and developer-focused demos alternate to maintain broad momentum across the team.

| # | Demo | Audience | Pattern | Brief |
|---|------|----------|---------|-------|
| 1 | **Team Changelog Agent** | Everyone | Scheduled + multi-source | Pulls merged PRs (GitHub) and completed issues (Linear) on a weekly cadence, formats them as a readable changelog, and posts to Slack. Broad team visibility from day one. |
| 2 | **Engineer Roster Agent** | Everyone | Multi-source tool calling | Answers natural language questions about who's working on what, who's on call, and who's on holiday — sourced from Linear, Grafana, and Personio. |
| 3 | **Internal Dependency Updater** | Devs | Autonomous action + GitHub | Monitors internal package releases and automatically opens version-bump PRs across all consumer repos — internal Dependabot scoped to our own libraries. |
| 4 | **Plan Drift Monitor** | Leads + devs | Proactive monitoring | Watches Linear, Grafana, and Personio for deviations — unassigned work piling up, on-call gaps during holidays, sprint goals at risk — and sends proactive Slack alerts. |
| 5 | **Log Analyst** | Devs + leads | Multi-step workflow | Reads production logs, spots errors, correlates them with observability tools and the codebase, and proposes fixes as GitHub PRs. Full pipeline: logs → context → diagnosis → automated PR. |
| 6 | **Incident Summarizer** | Devs + leads | Event-driven | Triggered by incidents; pulls Slack threads, PagerDuty alerts, and deploy logs to generate a draft post-mortem with a timeline and action items. |
| 7 | **Team MCP Skills Layer** | Org-wide | Platform / MCP | Each team ships an MCP server exposing their services as agent-callable tools — the shared integration layer that makes all prior demos composable and reusable across the org. |

## Deferred Ideas

Not dropped — lower priority until team buy-in is established:

- **Onboarding Assistant** — RAG over internal wikis, architecture docs, and runbooks for new engineers
- **Meeting Prep Agent** — surfaces open tasks, recent PRs, and past notes before 1:1s and syncs
- **Internal Dependency Updater** — already included at #3

## Next Steps

Each demo gets its own brainstorming + spec session before implementation. Start with **Team Changelog Agent (#1)**.
