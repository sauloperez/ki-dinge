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
  const data = await response.json() as ChatResponse;
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

const query = "What's the name of this host?";
console.log(`Query: ${query}\n`);

const response1 = await chat({
  model: MODEL,
  stream: false,
  messages: [{ role: "user", content: query }],
  tools,
});

const toolCall = response1.message.tool_calls?.[0];
if (!toolCall) {
  console.log(response1.message.content);
  process.exit(0);
}

console.log(`→ Tool call: ${toolCall.function.name}`);
const toolResult = executeTool(toolCall.function.name);
console.log(`→ Tool result: ${toolResult}\n`);

const response2 = await chat({
  model: MODEL,
  stream: false,
  messages: [
    { role: "user", content: query },
    response1.message,
    { role: "tool", content: toolResult },
  ],
});

console.log(response2.message.content);
