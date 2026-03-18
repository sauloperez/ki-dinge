import "dotenv/config";

import { OpenRouter } from '@openrouter/sdk';
import { AssistantMessage, Message, ToolResponseMessage } from "@openrouter/sdk/models";
import { TOOL_MAPPING, tools } from "./tools.js";

const MAX_ITERATIONS = 10;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEBUG = process.argv.includes("--debug");

const model = "openrouter/free";

const debug = (...args: unknown[]) => {
  if (DEBUG) console.error("[debug]", ...args);
};

const openRouter = new OpenRouter({
  apiKey: OPENROUTER_API_KEY,
});

const prompt = process.argv.find((arg) => arg === "--prompt" && process.argv.indexOf(arg) >= 2);
if (prompt === undefined) {
  console.error("Please provide a prompt using --prompt \"your question here\"");
  process.exit(1);
}

const messages: Array<Message> = [
  {
    role: "system",
    content: "You are a git assistant. Use your tools to answer questions about the repository's state, history, and changes."
  },
  {
    role: "user",
    content: prompt,
  }
];

const chat = async (messages: Message[]): Promise<AssistantMessage> => {
  debug(`sending ${messages.length} messages to model`);
  const result = await openRouter.chat.send({
    chatGenerationParams: {
      model,
      tools,
      messages,
      stream: false,
    },
  });

  // Append the response to the messages array so the LLM has the full context
  const message = result.choices[0].message;
  debug(`received response: role=${message.role}, toolCalls=${message.toolCalls?.length ?? 0}`);
  messages.push(message);
  return message;
};

const getToolResponse = async (message: AssistantMessage): Promise<ToolResponseMessage> => {
  const toolCalls = message.toolCalls;
  if (toolCalls === undefined) {
    return { role: 'tool', toolCallId: '', content: 'No tool calls in response' };
  }

  const toolCall = toolCalls[0];
  const toolName = toolCall.function.name;
  const toolArgs = JSON.parse(toolCall.function.arguments);

  debug(`calling tool: ${toolName}`, toolArgs);

  // Look up the correct tool locally, and call it with the provided arguments
  // Other tools can be added without changing the agentic loop
  const toolResult = await TOOL_MAPPING[toolName]();

  debug(`tool result:`, toolResult);

  return {
    role: 'tool',
    toolCallId: toolCall.id,
    content: JSON.stringify(toolResult),
  }
};

debug(`starting agent loop (max ${MAX_ITERATIONS} iterations)`);
for (let i = 0; i < MAX_ITERATIONS; i++) {
  debug(`iteration ${i + 1}`);
  const message = await chat(messages);

  // No more tool calls, so we can return the final response to the user
  if (message.toolCalls === undefined) {
    debug(`no tool calls, ending loop after ${i + 1} iteration(s)`);
    break;
  }

  // Now we process the requested tool calls, and use our book lookup tool
  const toolResponse = await getToolResponse(message);
  messages.push(toolResponse);
}

console.log(messages[messages.length - 1].content);
