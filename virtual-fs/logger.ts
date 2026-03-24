import { appendFile } from 'fs/promises';
import { join } from 'path';

const LOG_PATH = join(new URL('.', import.meta.url).pathname, 'logs/debug.log');

export async function logToolCall(name: string, input: unknown, output: unknown) {
  const entry = JSON.stringify({ ts: new Date().toISOString(), tool: name, input, output }) + '\n';
  await appendFile(LOG_PATH, entry);
}
