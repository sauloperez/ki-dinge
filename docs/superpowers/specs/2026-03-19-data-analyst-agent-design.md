# Data Analyst Agent — Design Spec

Date: 2026-03-19

## Overview

A conversational REPL-based agent that lets users ask natural language questions about a SQLite database. The agent self-discovers the schema using tools, then queries the data to produce answers. Built as a self-contained PoC in the `data-analyst/` folder of the ki-dinge monorepo.

This PoC intentionally introduces the **Vercel AI SDK** (`ai`) and the **AI Gateway** provider (`@ai-sdk/gateway`) — a deliberate departure from the `@openrouter/sdk` pattern used in other PoCs. This allows the PoC to demonstrate how the Vercel AI SDK's tool-calling and multi-step agent loop works.

## Architecture

### Stack

- **Vercel AI SDK** (`ai`) — agentic loop via `generateText` with tools and `maxSteps`
- **`@ai-sdk/gateway`** — AI Gateway provider; requires `AI_GATEWAY_API_KEY` environment variable
- **`better-sqlite3`** — synchronous SQLite access, no async complexity
- **`tsx`** — TypeScript execution (consistent with other PoCs in the monorepo)
- **TypeScript + pnpm** — consistent with monorepo conventions

### Model

Use the latest available Anthropic Claude model via AI Gateway (fetch the current model list at implementation time to select the highest-versioned `claude-sonnet-*` or equivalent).

### Entry Point

`index.ts` implements a REPL loop:

1. Prompt user for input via stdin using `readline`
2. Append user message to conversation history (`CoreMessage[]`)
3. Call `generateText` with the full history, tools, system prompt, and `maxSteps: 10`
4. Print the assistant's text response
5. Append assistant response to history
6. Repeat until user types `exit` or hits `Ctrl+C`

Conversation history is kept in memory for the session duration only.

### System Prompt

The system prompt must instruct the agent to:

1. Always call `listTables` first if it does not yet know the schema
2. Call `describeTable` on any table before querying it
3. Use `runQuery` with precise `SELECT` statements to answer the user's question
4. Format results clearly — use prose for summaries, markdown tables for tabular data, and include units where relevant (e.g. currency, counts)
5. If a query returns no rows, say so explicitly rather than hallucinating an answer

### `maxSteps`

Pass `maxSteps: 10` to `generateText`. This caps the number of tool-call/response iterations the LLM can perform before returning, preventing runaway loops.

### Sample Database

`seed.ts` creates the `data/` directory if it does not exist, then creates `data/store.db` with ~50-100 rows across three tables:

| Table | Columns |
|-------|---------|
| `customers` | id, name, email, country, created_at |
| `products` | id, name, category, price |
| `orders` | id, customer_id, product_id, quantity, total, ordered_at |

Data includes multiple countries, product categories, and date ranges to support varied analytical questions (e.g. "which country has the highest average order value?", "what is the best-selling category?").

`data/store.db` is gitignored. The `data/` directory is also gitignored (the seed script creates it). A `.gitkeep` is not needed since the seed script is authoritative.

### `package.json` Scripts

```json
{
  "scripts": {
    "start": "tsx index.ts",
    "seed": "tsx seed.ts"
  }
}
```

Users run `pnpm seed` once to create the database, then `pnpm start` to launch the REPL.

## Tools

Three read-only tools defined in `tools.ts` using the AI SDK `tool()` helper:

### `listTables`

- **Input:** none (empty `z.object({})`)
- **Output:** `{ tables: string[] }`
- **Implementation:** `PRAGMA table_list` or `SELECT name FROM sqlite_master WHERE type='table'`
- **Purpose:** entry point for schema discovery

### `describeTable`

- **Input:** `{ tableName: string }`
- **Output:** `{ columns: Array<{ name: string, type: string, nullable: boolean }> }`
- **Implementation:** `PRAGMA table_info(tableName)`. The `notnull` field from PRAGMA is an integer (1 = not null, 0 = nullable); convert to `nullable = notnull === 0`
- **Purpose:** understand structure of a specific table before querying

### `runQuery`

- **Input:** `{ sql: string }`
- **Output:** `{ rows: Record<string, unknown>[] }` or `{ error: string }` on rejection
- **Constraint:** trims the SQL and checks that it starts with `SELECT` (case-insensitive). Return `{ error: "Only SELECT statements are allowed." }` for any other statement — do not throw.
- **Row limit:** cap results at 100 rows (append `LIMIT 100` internally, or use `.all()` and slice). Return a `truncated: true` field when the cap is hit so the LLM knows results are partial.
- **Purpose:** fetch data to answer the user's question

## Data Flow

```
User input
  → REPL appends to history as { role: 'user', content }
  → generateText({ model, system, messages: history, tools, maxSteps: 10 })
    → LLM calls listTables / describeTable / runQuery as needed (up to 10 steps)
    → tools execute synchronously against store.db
    → LLM produces final text answer
  → REPL prints answer
  → REPL appends { role: 'assistant', content: answer } to history
  → next prompt
```

## File Structure

```
data-analyst/
├── data/               # gitignored; created by seed script
│   └── store.db        # SQLite database (created by pnpm seed)
├── index.ts            # REPL entry point
├── tools.ts            # listTables, describeTable, runQuery
├── seed.ts             # creates data/ and populates store.db
├── package.json        # includes start and seed scripts
├── tsconfig.json
└── README.md
```

## Error Handling

- Non-SELECT SQL in `runQuery`: return `{ error: "Only SELECT statements are allowed." }`, do not throw
- Missing database file on startup: print a clear message — `"Database not found. Run 'pnpm seed' first."` — and exit with code 1
- LLM errors: propagate and print to stderr, exit gracefully
- `describeTable` called with an unknown table name: return `{ error: "Table not found." }`

## Out of Scope

- Write operations (INSERT, UPDATE, DELETE)
- Persistent conversation history across sessions
- Accepting an external database path as CLI argument
- A web UI or API server
- Pagination beyond the 100-row cap
