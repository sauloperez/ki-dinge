# Tool Calling PoC

Demonstrates the tool calling (function calling) loop using Ollama's chat API. Two implementations are provided for comparison — a shell script and a TypeScript version.

## How it works

The script sends a user query to the model along with a tool definition (`get_hostname`). If the model decides to call the tool, the script:

1. Detects the tool call in the model's response
2. Executes the tool locally (`hostname` / `os.hostname()`)
3. Sends the result back to the model in a follow-up message
4. Prints the model's final answer

This illustrates the core agentic pattern: model requests a tool → host executes it → model uses the result.

## Implementations

- **`tool-calling.sh`** — shell script using `curl` and `jq`. Lower-level: the raw HTTP requests and JSON manipulation are visible.
- **`main.ts`** — TypeScript using `fetch`. Higher-level: typed data structures make the message flow easier to follow.

## Usage

1. Ensure Ollama is running locally: `ollama serve`
2. Pull a supported model: `ollama pull qwen2.5:7b`

**Shell:**
```bash
./tool-calling.sh
./tool-calling.sh llama3.2
```

**TypeScript:**
```bash
pnpm install
pnpm start
pnpm start llama3.2
```

The model defaults to `qwen2.5:7b`. Not all Ollama models support tool calling — use one that does (e.g., `qwen2.5:7b`, `llama3.1`, `mistral-nemo`).

Pass `--debug` to print all requests and responses:

```bash
DEBUG=1 ./tool-calling.sh
pnpm start --debug
pnpm start llama3.2 --debug
```
