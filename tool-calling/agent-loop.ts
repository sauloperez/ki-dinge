import os from "os";

const OLLAMA_URL = "http://localhost:11434/api/chat";
const args = process.argv.slice(2);
const DEBUG = args.includes("--debug");
const MODEL = args.find((a) => !a.startsWith("--")) ?? "qwen2.5:7b";

interface Message {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
}

interface ToolCall {
  function: { name: string; arguments: Record<string, unknown> };
}

interface ChatRequest {
  model: string;
  stream: boolean;
  messages: Message[];
  tools?: ToolDefinition[];
}

interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: { type: "object"; properties: object; required: string[] };
  };
}

interface ChatResponse {
  message: Message;
}

async function chat(request: ChatRequest): Promise<ChatResponse> {
  if (DEBUG) console.log("→ Request:\n", JSON.stringify(request, null, 2), "\n");
  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    body: JSON.stringify(request),
  });
  const data = (await response.json()) as ChatResponse;
  if (DEBUG) console.log("→ Response:\n", JSON.stringify(data, null, 2), "\n");
  return data;
}

const tools: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_hostname",
      description: "Get the hostname of the current machine",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

function executeTool(name: string): string {
  if (name === "get_hostname") return os.hostname();
  throw new Error(`Unknown tool: ${name}`);
}

const MAX_ITERATIONS = 10;

// Agent loop: keep calling the model until it stops requesting tools
const messages: Message[] = [{ role: "user", content: "What's the name of this host?" }];
console.log(`Query: ${messages[0].content}\n`);

for (let i = 0; i < MAX_ITERATIONS; i++) {
  const { message } = await chat({ model: MODEL, stream: false, messages, tools });
  messages.push(message);

  if (!message.tool_calls?.length) {
    // No tool calls — the model is done, print its final answer
    console.log(message.content);
    break;
  }

  for (const toolCall of message.tool_calls) {
    console.log(`→ Tool call: ${toolCall.function.name}`);
    const result = executeTool(toolCall.function.name);
    console.log(`→ Tool result: ${result}\n`);
    messages.push({ role: "tool", content: result });
  }
}
