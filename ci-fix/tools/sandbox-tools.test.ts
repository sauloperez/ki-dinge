import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSandbox, destroySandbox } from '../sandbox.ts';
import { createSandboxTools } from './sandbox-tools.ts';

const ctx = { toolCallId: 'test', messages: [] as never[], abortSignal: undefined as never };

describe('sandbox tools', () => {
  let containerId: string;
  let tools: ReturnType<typeof createSandboxTools>;

  beforeAll(async () => {
    containerId = await createSandbox({ githubToken: 'fake' });
    tools = createSandboxTools({ containerId });
  }, 30_000);

  afterAll(async () => {
    if (containerId) await destroySandbox(containerId);
  });

  it('run_command executes a command and returns output', async () => {
    const result = await tools.run_command.execute!(
      { command: 'echo hello' }, ctx,
    ) as { stdout: string; exitCode: number };
    expect(result.stdout.trim()).toBe('hello');
    expect(result.exitCode).toBe(0);
  });

  it('write_file creates a file', async () => {
    const result = await tools.write_file.execute!(
      { path: '/tmp/test.txt', content: 'hello world' }, ctx,
    ) as { success: boolean };
    expect(result.success).toBe(true);
  });

  it('read_file reads the file back', async () => {
    const result = await tools.read_file.execute!(
      { path: '/tmp/test.txt' }, ctx,
    ) as { content: string };
    expect(result.content).toBe('hello world');
  });

  it('list_files lists directory contents', async () => {
    const result = await tools.list_files.execute!(
      { path: '/tmp' }, ctx,
    ) as { files: string[] };
    expect(result.files).toContain('test.txt');
  });

  it('search_code finds patterns in files', async () => {
    await tools.run_command.execute!(
      { command: 'mkdir -p /home/project/src && echo "const foo = 42;" > /home/project/src/index.ts' }, ctx,
    );
    const result = await tools.search_code.execute!(
      { pattern: 'foo', glob: '*.ts' }, ctx,
    ) as { matches: Array<{ line: string }> };
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].line).toContain('foo');
  });
}, 60_000);
