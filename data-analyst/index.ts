import { createInterface } from 'readline';
import { existsSync } from 'fs';
import { config } from 'dotenv';
import type { ModelMessage } from 'ai';

const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
};

config();

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

const ask = () => rl.question(`\n${c.cyan}${c.bold}You${c.reset} › `, { signal: ac.signal }, async (input) => {
  const trimmed = input.trim();
  if (!trimmed || trimmed.toLowerCase() === 'exit') {
    rl.close();
    return;
  }

  history.push({ role: 'user', content: trimmed });

  // TODO: call the agent here, push response to history, print it

  ask();
});

console.log(`\n${c.bold}Data Analyst Agent${c.reset} ${c.dim}— type your question or "exit" to quit${c.reset}\n`);
ask();
