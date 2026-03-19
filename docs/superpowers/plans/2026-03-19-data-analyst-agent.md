# Data Analyst Agent — Implementation Plan

> **This is a reference plan for self-guided implementation.** Work through the tasks in order. Each task ends with a commit.

**Goal:** A conversational REPL agent that answers natural language questions about a SQLite database by self-discovering the schema and running queries.

**Architecture:** Vercel AI SDK (`ai`) powers the agentic loop via `generateText` + tools. `better-sqlite3` provides synchronous SQLite access. A seed script creates a sample e-commerce database. The entry point is a readline REPL that maintains conversation history in memory.

**Tech Stack:** TypeScript, `ai` (Vercel AI SDK), `better-sqlite3`, `tsx`, `zod`, `pnpm`

---

## Key API Notes (read before coding)

### AI Gateway / model

The `gateway` provider is built into the `ai` package — no extra install needed:

```ts
import { gateway } from 'ai';
// use as: model: gateway('alibaba/qwen-3-235b')
```

Requires `AI_GATEWAY_API_KEY` in your environment (`.env` file + `dotenv`).

### Tool definition

```ts
import { tool } from 'ai';
import { z } from 'zod';

const myTool = tool({
  description: 'What this tool does',
  inputSchema: z.object({ foo: z.string() }),   // NOT "parameters"
  execute: async ({ foo }) => ({ result: foo }),
});
```

### generateText with tools

```ts
import { generateText, stepCountIs } from 'ai';

const { text, messages } = await generateText({
  model: gateway('alibaba/qwen-3-235b'),
  system: '...',
  messages: history,          // CoreMessage[]
  tools: { listTables, describeTable, runQuery },
  stopWhen: stepCountIs(10),  // NOT maxSteps
});
```

### Conversation history

```ts
import { CoreMessage } from 'ai';

const history: CoreMessage[] = [];
history.push({ role: 'user', content: userInput });
// after generateText:
history.push({ role: 'assistant', content: text });
```

---

## Task 1: Project scaffold

**Files to create:**
- `data-analyst/package.json`
- `data-analyst/tsconfig.json`
- `data-analyst/.gitignore`
- `data-analyst/.env.example`

**Steps:**

- [x] `cd data-analyst && pnpm init` (already done by scaffolding)
- [x] Install dependencies:
  ```bash
  pnpm add ai better-sqlite3 dotenv zod
  pnpm add -D tsx typescript @types/node @types/better-sqlite3
  ```
- [x] Update `package.json` scripts:
  ```json
  {
    "type": "module",
    "scripts": {
      "start": "tsx index.ts",
      "seed": "tsx seed.ts",
      "typecheck": "tsc --noEmit"
    }
  }
  ```
- [x] Create `tsconfig.json` (copy from `git-assistant/tsconfig.json` — same settings)
- [x] Create `.gitignore`:
  ```
  data/
  node_modules/
  .env
  dist/
  ```
- [x] Create `.env.example`:
  ```
  AI_GATEWAY_API_KEY=your_key_here
  ```
- [x] Commit: `feat: scaffold data-analyst PoC`

---

## Task 2: Seed script

**File:** `data-analyst/seed.ts`

**Goal:** Create `data/store.db` with 3 tables and ~50-100 rows of sample e-commerce data.

**Steps:**

- [x] Create `seed.ts`. Structure:
  1. `import Database from 'better-sqlite3'` and `import { mkdirSync } from 'fs'`
  2. `mkdirSync('data', { recursive: true })` — creates `data/` if missing
  3. Open `new Database('data/store.db')`
  4. Run `CREATE TABLE IF NOT EXISTS` for each table (drop first if you want a clean seed)
  5. Insert rows using prepared statements

- [x] Tables and columns:
  ```sql
  CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    country TEXT NOT NULL,
    created_at TEXT NOT NULL   -- ISO date string e.g. '2024-01-15'
  );

  CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL
  );

  CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    total REAL NOT NULL,       -- quantity * price
    ordered_at TEXT NOT NULL   -- ISO date string
  );
  ```

- [x] Seed data tips:
  - 5-8 countries (e.g. US, UK, Germany, France, Japan, Brazil, Canada)
  - 4-5 product categories (e.g. Electronics, Clothing, Books, Home, Sports)
  - ~10 customers, ~15 products, ~60 orders
  - Vary dates across 2023-2024 so date-range queries are interesting

- [x] Run it: `pnpm seed` — verify `data/store.db` is created, no errors
- [x] Commit: `feat: add seed script with sample e-commerce database`

---

## Task 3: Tools

**File:** `data-analyst/tools.ts`

**Goal:** Three SQLite tools the agent can call.

**Steps:**

- [x] Import `Database` from `better-sqlite3`, `tool` from `ai`, `z` from `zod`
- [x] Open the database at the top of the file:
  ```ts
  import Database from 'better-sqlite3';
  const db = new Database('data/store.db');
  ```
- [x] Implement `listTables`:
  ```ts
  export const listTables = tool({
    description: 'List all tables in the database',
    inputSchema: z.object({}),
    execute: async () => {
      const rows = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      ).all() as { name: string }[];
      return { tables: rows.map(r => r.name) };
    },
  });
  ```
- [x] Implement `describeTable`:
  ```ts
  export const describeTable = tool({
    description: 'Get column names, types, and nullability for a table',
    inputSchema: z.object({ tableName: z.string() }),
    execute: async ({ tableName }) => {
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
      ).all(tableName);
      if (tables.length === 0) return { error: 'Table not found.' };

      const info = db.prepare(`PRAGMA table_info(${tableName})`).all() as
        { name: string; type: string; notnull: number }[];
      return {
        columns: info.map(col => ({
          name: col.name,
          type: col.type,
          nullable: col.notnull === 0,   // notnull=1 means NOT NULL, so invert
        })),
      };
    },
  });
  ```
- [x] Implement `runQuery`:
  ```ts
  const ROW_LIMIT = 100;

  export const runQuery = tool({
    description: 'Run a read-only SELECT query against the database',
    inputSchema: z.object({ sql: z.string() }),
    execute: async ({ sql }) => {
      if (!sql.trim().toUpperCase().startsWith('SELECT')) {
        return { error: 'Only SELECT statements are allowed.' };
      }
      try {
        const rows = db.prepare(sql).all() as Record<string, unknown>[];
        const truncated = rows.length > ROW_LIMIT;
        return { rows: rows.slice(0, ROW_LIMIT), truncated };
      } catch (err) {
        return { error: (err as Error).message };
      }
    },
  });
  ```
- [x] Run `pnpm typecheck` — fix any errors
- [x] Commit: `feat: implement listTables, describeTable, runQuery tools`

---

## Task 4: REPL entry point

**File:** `data-analyst/index.ts`

**Goal:** Interactive readline loop that calls the agent and maintains history.

**Steps:**

- [ ] Import what you need:
  ```ts
  import { createInterface } from 'readline';
  import { existsSync } from 'fs';
  import { config } from 'dotenv';
  import { generateText, gateway, stepCountIs, CoreMessage } from 'ai';
  import { listTables, describeTable, runQuery } from './tools.js';
  ```
- [ ] Load env and check for DB:
  ```ts
  config();

  if (!existsSync('data/store.db')) {
    console.error("Database not found. Run 'pnpm seed' first.");
    process.exit(1);
  }
  ```
- [ ] Define the system prompt:
  ```ts
  const SYSTEM = `You are a data analyst assistant. You have access to a SQLite database.

  Rules:
  1. If you don't know the schema yet, always call listTables first.
  2. Before querying a table, call describeTable to understand its columns.
  3. Use runQuery with precise SELECT statements to answer the user's question.
  4. Format results clearly: prose for summaries, markdown tables for tabular data. Include units (e.g. $, count).
  5. If a query returns no rows, say so explicitly — never guess or hallucinate data.`;
  ```
- [ ] Set up the REPL loop:
  ```ts
  const history: CoreMessage[] = [];
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const ask = () => rl.question('\nYou: ', async (input) => {
    const trimmed = input.trim();
    if (!trimmed || trimmed.toLowerCase() === 'exit') {
      rl.close();
      return;
    }

    history.push({ role: 'user', content: trimmed });

    try {
      const { text } = await generateText({
        model: gateway('alibaba/qwen-3-235b'),
        system: SYSTEM,
        messages: history,
        tools: { listTables, describeTable, runQuery },
        stopWhen: stepCountIs(10),
      });

      console.log(`\nAgent: ${text}`);
      history.push({ role: 'assistant', content: text });
    } catch (err) {
      console.error('Error:', (err as Error).message);
    }

    ask();
  });

  console.log('Data Analyst Agent — type your question or "exit" to quit.');
  ask();
  ```
- [ ] Run `pnpm typecheck` — fix any errors
- [ ] Smoke test: `pnpm start` — ask "what tables are in the database?"
- [ ] Commit: `feat: add REPL entry point`

---

## Task 5: README

**File:** `data-analyst/README.md`

**Steps:**

- [ ] Write a README following the monorepo convention. Include:
  - One-line description
  - How it works (tools, agentic loop, AI Gateway)
  - Prerequisites (`AI_GATEWAY_API_KEY`)
  - Usage:
    ```bash
    cp .env.example .env   # add your key
    pnpm install
    pnpm seed
    pnpm start
    ```
  - Example questions to try

- [ ] Commit: `docs: add data-analyst README`

---

## Suggested questions to test with

- "What tables are in the database?"
- "How many customers do we have per country?"
- "What's the best-selling product category by revenue?"
- "Show me the top 5 customers by total spend."
- "What was our total revenue in 2024?"
- "Which product has the highest average order quantity?"
