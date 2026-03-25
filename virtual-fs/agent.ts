import { config } from 'dotenv';
import { createInterface } from 'readline';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { streamText, stepCountIs, type ModelMessage } from 'ai';
import 'dotenv/config';
import { streamResponse } from './stream.ts';
import { LocalBackend } from './backends/local.ts';
import { GDriveBackend } from './backends/gdrive.ts';
import { VirtualFS } from './vfs.ts';
import { createVfsTools } from './tools.ts';

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

config();

const backend = process.env.GDRIVE_KEY_FILE && process.env.GDRIVE_ROOT_FOLDER_PATH
  ? new GDriveBackend({
      keyFile: process.env.GDRIVE_KEY_FILE,
      rootFolderPath: process.env.GDRIVE_ROOT_FOLDER_PATH,
    })
  : new LocalBackend(new URL('./data', import.meta.url).pathname);

const vfs = VirtualFS.mount({ prefix: '', backend });

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
      tools: createVfsTools(vfs),
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
