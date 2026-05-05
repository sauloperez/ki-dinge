# Get Hostname (Agent Loop)

Demonstrates the canonical agent loop in TypeScript using a local Ollama model.

## How it works

Sends a query with a `get_hostname` tool definition and loops until the model stops requesting tools. Each iteration: call the model, check for tool calls, execute them locally via `os.hostname()`, append results, and repeat.

## Usage

1. Ensure Ollama is running: `ollama serve`
2. Pull a supported model: `ollama pull qwen2.5:7b`

```bash
pnpm install
pnpm tsx get-hostname.ts
pnpm tsx get-hostname.ts llama3.2
```

The model defaults to `qwen2.5:7b`. Not all Ollama models support tool calling — use one that does (e.g., `qwen2.5:7b`, `llama3.1`, `mistral-nemo`).

Pass `--debug` to print all requests and responses:

```bash
pnpm tsx get-hostname.ts --debug
```
