import { createInterface } from 'readline';
import { existsSync } from 'fs';
import { config } from 'dotenv';
import { gateway, streamText, stepCountIs, type ModelMessage } from 'ai';
import { describeTable, listTables, runQuery } from './tools.ts';

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
};

config();

const model = process.env.MODEL || 'alibaba/qwen-3-235b';
const SYSTEM_PROMPT = `You are a data analyst assistant. You have access to a SQLite database.

Rules:
1. If you don't know the schema yet, always call listTables first.
2. Before querying a table, call describeTable to understand its columns.
3. Use runQuery with precise SELECT statements to answer the user's question.
4. Format results clearly: prose for summaries, markdown tables for tabular data. Include units (e.g. $, count).
5. If a query returns no rows, say so explicitly — never guess or hallucinate data.`;

if (!existsSync('data/store.db')) {
  console.error(`${c.yellow}⚠ Database not found. Run 'pnpm seed' first.${c.reset}`);
  process.exit(1);
}

const history: ModelMessage[] = [];

const ac = new AbortController();
const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.once('close', () => ac.abort());

rl.on('close', () => {
  console.log(`\n${c.dim}Goodbye!${c.reset}`);
  process.exit(0);
});

const streamResponse = async (result: ReturnType<typeof streamText>) => {
  process.stdout.write(`\n${c.green}${c.bold}Agent${c.reset} › `);
  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
  process.stdout.write('\n');
};

const ask = () => rl.question(`\n${c.cyan}${c.bold}You${c.reset} › `, { signal: ac.signal }, async (input) => {
  const trimmed = input.trim();
  if (!trimmed || trimmed.toLowerCase() === 'exit') {
    rl.close();
    return;
  }

  history.push({ role: 'user', content: trimmed });

  try {
    const result = streamText({
      model: gateway(model),
      system: SYSTEM_PROMPT,
      messages: history,
      tools: { listTables, describeTable, runQuery },
      stopWhen: stepCountIs(10),
    });

    await streamResponse(result);

    history.push({ role: 'assistant', content: await result.text });
  } catch (err) {
    console.error(`\n${c.yellow}⚠ ${(err as Error).message}${c.reset}`);
  }

  ask();
});

console.log(`\n${c.bold}Data Analyst Agent${c.reset} ${c.dim}— type your question or "exit" to quit${c.reset}\n`);
ask();
