import "dotenv/config";

import { Message } from "@openrouter/sdk/models";
import { tools } from "./tools.js";
import { Agent } from "./agent.js";

const promptIndex = process.argv.findIndex((arg) => arg === "--prompt");
const prompt = promptIndex !== -1 ? process.argv[promptIndex + 1] : undefined;
if (prompt === undefined) {
  console.error("Please provide a prompt using --prompt \"your question here\"");
  process.exit(1);
}

export const messages: Message[] = [
  {
    role: "system",
    content: "You are a git assistant. Use your tools to answer questions about the repository's state, history, and changes."
  },
  {
    role: "user",
    content: prompt,
  }
]

const agent = new Agent({
  model: "openrouter/free",
  messages,
  tools,
});

const result = await agent.generate();
console.log(result.content);
