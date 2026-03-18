import { ToolDefinitionJson, AssistantMessage, Message, ToolResponseMessage } from "@openrouter/sdk/models";
import { OpenRouter } from '@openrouter/sdk';
import { TOOL_MAPPING } from "./tools.js";

const DEBUG = process.argv.includes("--debug");
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const MAX_ITERATIONS = 10;

type AgentConfig = {
  model: string;
  tools: ToolDefinitionJson[];
  messages: Message[];
};

const debug = (...args: unknown[]) => {
  if (DEBUG) console.error("[debug]", ...args);
};



export class Agent {
  private config: AgentConfig;
  private openRouter: OpenRouter;
  private messages: Message[];

  constructor(config: AgentConfig) {
    this.config = config;
    this.messages = config.messages;
    this.openRouter = new OpenRouter({
      apiKey: OPENROUTER_API_KEY,
    });
  }

  async generate(): Promise<Message> {
    debug(`starting agent loop (max ${MAX_ITERATIONS} iterations)`);

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      debug(`iteration ${i + 1}`);
      const message = await this.chat(this.messages);

      // No more tool calls, so we can return the final response to the user
      if (message.toolCalls === undefined) {
        debug(`no tool calls, ending loop after ${i + 1} iteration(s)`);
        break;
      }

      // Now we process the requested tool calls, and use our book lookup tool
      const toolResponse = await this.getToolResponse(message);
      this.messages.push(toolResponse);
    }

    return this.messages[this.messages.length - 1];
  };

  getToolResponse = async (message: AssistantMessage): Promise<ToolResponseMessage> => {
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
    const toolResult = await TOOL_MAPPING[toolName](toolArgs);

    debug(`tool result:`, toolResult);

    return {
      role: 'tool',
      toolCallId: toolCall.id,
      content: JSON.stringify(toolResult),
    }
  };

  chat = async (messages: Message[]): Promise<AssistantMessage> => {
    debug(`sending ${messages.length} messages to model`);

    const { model, tools } = this.config;

    const result = await this.openRouter.chat.send({
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

};
