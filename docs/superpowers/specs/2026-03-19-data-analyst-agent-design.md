# Data Analyst Agent — Design Spec

Date: 2026-03-19

## Overview

A conversational REPL-based agent that lets users ask natural language questions about a SQLite database. The agent self-discovers the schema using tools, then queries the data to produce answers. Built as a self-contained PoC in the `data-analyst/` folder of the ki-dinge monorepo.

## Architecture

### Stack

- **Vercel AI SDK** (`ai`) — agentic loop via `generateText` with tools
- **AI Gateway** — unified LLM provider endpoint
- **`better-sqlite3`** — synchronous SQLite access, no async complexity
- **TypeScript + pnpm** — consistent with monorepo conventions

### Entry Point

`index.ts` implements a REPL loop:

1. Prompt user for input via stdin
2. Append user message to conversation history
3. Call `generateText` with the full history and tools
4. Print the assistant response
5. Append assistant response to history
6. Repeat until user exits (`Ctrl+C` or `exit`)

Conversation history is kept in memory for the session duration.

### Sample Database

`seed.ts` creates `data/store.db` with ~50-100 rows across three tables:

| Table | Columns |
|-------|---------|
| `customers` | id, name, email, country, created_at |
| `products` | id, name, category, price |
| `orders` | id, customer_id, product_id, quantity, total, ordered_at |

Data includes multiple countries, product categories, and date ranges to support varied analytical questions.

## Tools

Three read-only tools exposed to the agent:

### `listTables`

- **Input:** none
- **Output:** array of table name strings
- **Purpose:** entry point for schema discovery

### `describeTable`

- **Input:** `tableName: string`
- **Output:** array of `{ name, type, nullable }` per column
- **Purpose:** understand structure of a specific table before querying

### `runQuery`

- **Input:** `sql: string`
- **Output:** array of row objects (JSON)
- **Constraint:** rejects any statement that is not a `SELECT` (case-insensitive check on trimmed input)
- **Purpose:** fetch data to answer the user's question

## Data Flow

```
User input
  → REPL appends to history
  → generateText(history, tools)
    → LLM calls listTables / describeTable / runQuery as needed
    → tools execute against store.db
    → LLM produces final text answer
  → REPL prints answer, appends to history
  → next prompt
```

## File Structure

```
data-analyst/
├── data/
│   └── store.db          # created by seed script (gitignored)
├── index.ts              # REPL entry point
├── tools.ts              # listTables, describeTable, runQuery
├── seed.ts               # creates and populates store.db
├── package.json
├── tsconfig.json
└── README.md
```

## Error Handling

- Non-SELECT SQL in `runQuery`: return an error message string, do not throw
- Missing database file: print a helpful message directing user to run `pnpm seed`
- LLM errors: propagate and print to stderr, exit gracefully

## Out of Scope

- Write operations (INSERT, UPDATE, DELETE)
- Persistent conversation history across sessions
- Accepting an external database path as input
- A web UI or API server
