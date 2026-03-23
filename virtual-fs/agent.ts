import { config } from 'dotenv';
import { createInterface } from 'readline';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { streamText, stepCountIs, tool, type ModelMessage } from 'ai';
import { z } from 'zod';
import 'dotenv/config';
import { streamResponse } from './stream.ts';
import { LocalBackend } from './backends/local.ts';
import { VirtualFS } from './vfs.ts';

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

config();

const vfs = new VirtualFS(new LocalBackend(process.cwd()));
await vfs.init();

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

  try {
    const result = streamText({
      model: openrouter('openrouter/free'),
      system: 'You are a helpful assistant.',
      messages: history,
      tools: {
        list_files: tool({
          description: 'List all available files in the virtual filesystem',
          inputSchema: z.object({}),
          execute: async () => vfs.list(),
        }),
        read_file: tool({
          description: 'Read the contents of a file by its path',
          inputSchema: z.object({ path: z.string().describe('The file path to read') }),
          execute: async ({ path }) => vfs.read(path),
        }),
      },
      stopWhen: stepCountIs(5),
    });

    const assistantText = await streamResponse(result);
    history.push({ role: 'assistant', content: assistantText });
  } catch (err) {
    console.error(`\n${c.yellow}⚠ ${(err as Error).message}${c.reset}`);
  }

  ask();
});

console.log(`\n${c.bold}Virtual FS Agent${c.reset} ${c.dim}— type your question or "exit" to quit${c.reset}\n`);
ask();
