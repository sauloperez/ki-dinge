// ci-fix/agent.ts
import { streamText, stepCountIs, type ToolSet } from 'ai';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { SYSTEM_PROMPT } from './system-prompt.ts';

interface AgentConfig {
  model: string;
  tools: ToolSet;
  repo: string;
  branch: string;
}

export async function runAgent({ model, tools, repo, branch }: AgentConfig): Promise<void> {
  const initialMessage = `A CI build has failed for the repository "${repo}" on branch "${branch}". Please diagnose the failure and fix it.`;

  const result = streamText({
    model: openrouter(model),
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: initialMessage }],
    tools,
    stopWhen: stepCountIs(25),
  });

  for await (const event of result.textStream) {
    process.stdout.write(event);
  }

  console.log('\n');
}
