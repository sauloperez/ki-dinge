// ci-fix/agent.ts
import { streamText, stepCountIs, type ToolSet } from 'ai';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { SYSTEM_PROMPT } from './system-prompt.ts';

interface AgentConfig {
  model: string;
  tools: ToolSet;
  repo: string;
  branch: string;
  log: (msg: string) => void;
}

export async function runAgent({ model, tools, repo, branch, log }: AgentConfig): Promise<void> {

  const initialMessage = `A CI build has failed for the repository "${repo}" on branch "${branch}". Please diagnose the failure and fix it.`;

  const result = streamText({
    model: openrouter(model),
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: initialMessage }],
    tools,
    maxOutputTokens: 10649,
    stopWhen: stepCountIs(25),
    onStepFinish: ({ stepNumber, toolCalls, toolResults, finishReason, usage }) => {
      log(`\n[step:${stepNumber}] finishReason=${finishReason} tokens=${usage.totalTokens} toolCalls=${toolCalls.length} toolResults=${toolResults.length}`);
    },
  });

  for await (const part of result.fullStream) {
    switch (part.type) {
      case 'text-delta':
        process.stdout.write(part.text);
        break;
      case 'tool-call':
        log(`\n[tool-call] ${part.toolName}(${JSON.stringify(part.input)})`);
        break;
      case 'tool-result':
        log(`[tool-result] ${part.toolName} → ${JSON.stringify(part.output).slice(0, 200)}`);
        break;
      case 'error':
        log(`[error] ${part.error}`);
        break;
    }
  }

  console.log('\n');
}
