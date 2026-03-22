# Virtual File System Agent

A coding agent that keeps files out of the context window until explicitly needed.

## The Problem

A naive coding agent loads every relevant file into the LLM context upfront. This burns tokens, hits context limits quickly, and forces the agent to decide what's relevant before it has enough information to know.

## The Idea

Files live outside the context window and are only loaded when the agent calls a tool to fetch them. The agent works with **file references** — virtual paths — and uses tools like `load_file` or `grep_file` to pull in content on demand.

A **virtual file system** sits between the agent and real storage. It maintains a registry that maps virtual paths to actual storage locations, so the agent operates against a stable, coherent file namespace without knowing where files physically live or how they are stored.

The agent's perspective is simple: it sees a file system. The VFS decides where each file actually comes from.

## User Experience

Users reference files by prefixing them with `@` in their prompts:

```
Refactor the authentication logic in @src/auth.ts using the types from @src/types.ts
```

This is a plain-text convention — the harness passes the prompt as-is to the LLM. The agent then decides when to call `load_file("src/auth.ts")` to actually read the content.

At startup, the VFS initialises by querying each configured backend to discover available files and build the registry. The agent never sees the storage mapping or file contents; it just uses paths to decide what to load.

## How It Works

1. At startup, the VFS queries each configured backend and builds a registry of available files
2. User sends a prompt mentioning `@file` references
3. The LLM reasons about which files it needs and calls tools (`load_file`, `grep_file`, etc.) using virtual paths
4. The VFS looks up the registry, delegates to the appropriate backend, and returns the content
5. The LLM continues with only the content it actually requested

## Tools

| Tool | Description |
|------|-------------|
| `load_file(path)` | Load the full content of a file into context |
| `grep_file(path, pattern)` | Search a file for a pattern, without loading it fully |

## Storage Backends

The VFS delegates to storage backends via a simple interface: `list()` to discover available files at startup, and `read(path)` to fetch content on demand. The registry records which backend each virtual path belongs to. This PoC implements two backends:

- **Local filesystem** — resolves paths relative to the current working directory
- **Blob storage** — fetches files from an object store, demonstrating that the abstraction holds across storage types

## Project Structure

```
virtual-fs/
├── agent.ts          # Main agent loop
├── vfs.ts            # Virtual file system: registry and backend interface
├── tools.ts          # Tool definitions exposed to the LLM
└── backends/
    ├── local.ts      # Local filesystem backend
    └── blob.ts       # Blob storage backend
```
