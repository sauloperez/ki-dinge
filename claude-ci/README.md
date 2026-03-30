# Claude CI — Auto-update README

   GitHub Actions workflow that uses Claude to keep the repo's root README.md catalog up to date automatically.

## The Problem

Every time a new PoC is added to this monorepo, someone has to manually update the root README with its name, description, and stack. This is easy to forget and the catalog drifts out of date.

## How it works

A GitHub Actions workflow triggers on every push to `main` that modifies a PoC's `README.md` (or on manual dispatch). It runs the official [`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action) which:

1. Scans all top-level directories for `README.md` files
2. Extracts each PoC's title, summary, and tech stack
3. Generates a root `README.md` with a formatted table of all PoCs
4. Opens a PR with the changes for review

The prompt is embedded directly in the workflow file — no external scripts needed.

## Workflow trigger

 ```yml
 on:
   push:
     branches: [main]
     paths:
       - "*/README.md"    # any PoC README changes
   workflow_dispatch:       # manual trigger

