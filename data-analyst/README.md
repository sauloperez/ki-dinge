# Data Analyst Agent

Conversational REPL agent that answers natural language questions about a SQLite database by self-discovering the schema and running queries.

## How it works

The agent uses the Vercel AI SDK (`generateText` + tools) to drive an agentic loop:

1. Receives a natural language question
2. Calls `listTables` to discover the schema if needed
3. Calls `describeTable` to inspect column types before querying
4. Calls `runQuery` to execute a SELECT statement and return results
5. Formats the answer as prose or a markdown table

Conversation history is kept in memory across turns. The AI Gateway routes requests to `alibaba/qwen-3-235b` by default (configurable via the `MODEL` env var).

## Prerequisites

- Node.js + pnpm
- An `AI_GATEWAY_API_KEY` from Vercel AI Gateway

## Usage

```bash
cp .env.example .env   # add your AI_GATEWAY_API_KEY
pnpm install
pnpm seed              # creates data/store.db with sample e-commerce data
pnpm start
```

Type your question at the prompt, or `exit` to quit.

## Example questions

- "What tables are in the database?"
- "How many customers do we have per country?"
- "What's the best-selling product category by revenue?"
- "Show me the top 5 customers by total spend."
- "What was our total revenue in 2024?"
- "Which product has the highest average order quantity?"
