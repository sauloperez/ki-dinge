import "dotenv/config";

import { OpenRouter } from '@openrouter/sdk';
import { AssistantMessage, ChatResponse, Message, ToolResponseMessage } from "@openrouter/sdk/models";

const MAX_ITERATIONS = 10;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const model = "openrouter/free";

const openRouter = new OpenRouter({
  apiKey: OPENROUTER_API_KEY,
});

type Book = {
  id: number;
  title: string;
  authors: { name: string }[];
}

async function searchGutenbergBooks(args: { search_terms: string[] }): Promise<Book[]> {
  const { search_terms } = args;
  const searchQuery = search_terms.join(' ');
  const url = 'https://gutendex.com/books';
  const response = await fetch(`${url}?search=${searchQuery}`);
  const data = await response.json();

  return data.results.map((book: any) => ({
    id: book.id,
    title: book.title,
    authors: book.authors,
  }));
}

const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'searchGutenbergBooks',
      description:
        'Search for books in the Project Gutenberg library based on specified search terms',
      parameters: {
        type: 'object',
        properties: {
          search_terms: {
            type: 'array',
            items: {
              type: 'string',
            },
            description:
              "List of search terms to find books in the Gutenberg library (e.g. ['dickens', 'great'] to search for books by Dickens with 'great' in the title)",
          },
        },
        required: ['search_terms'],
      },
    },
  },
];

type ToolFunction = (args: Record<string, unknown>) => Promise<unknown>;

const TOOL_MAPPING: Record<string, ToolFunction> = {
  searchGutenbergBooks: searchGutenbergBooks as ToolFunction,
};

const task = "What are the titles of some James Joyce books?";

const messages: Array<Message> = [
  {
    role: "system",
    content: "You are a helpful assistant."
  },
  {
    role: "user",
    content: task,
  }
];

const chat = async (messages: Message[]): Promise<AssistantMessage> => {
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

  // Look up the correct tool locally, and call it with the provided arguments
  // Other tools can be added without changing the agentic loop
  const toolResult = await TOOL_MAPPING[toolName](toolArgs as Record<string, unknown>);

  return {
    role: 'tool',
    toolCallId: toolCall.id,
    content: JSON.stringify(toolResult),
  }
};

for (let i = 0; i < MAX_ITERATIONS; i++) {
  const message = await chat(messages);

  // No more tool calls, so we can return the final response to the user
  if (message.toolCalls === undefined) {
    break;
  }

  // Now we process the requested tool calls, and use our book lookup tool
  const toolResponse = await getToolResponse(message);
  messages.push(toolResponse);
}

console.log(messages[messages.length - 1].content);
