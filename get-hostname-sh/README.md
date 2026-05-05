# Get Hostname (Shell)

Demonstrates tool calling using a shell script, `curl`, and `jq` against a local Ollama model.

## How it works

Sends a query to Ollama with a `get_hostname` tool definition. When the model requests the tool, the script executes `hostname`, injects the result into a follow-up request, and prints the model's final answer. Two explicit HTTP calls make every step visible in raw JSON.

## Usage

1. Ensure Ollama is running: `ollama serve`
2. Pull a supported model: `ollama pull qwen2.5:7b`

```bash
./get-hostname.sh
./get-hostname.sh llama3.2
```

The model defaults to `qwen2.5:7b`. Not all Ollama models support tool calling — use one that does (e.g., `qwen2.5:7b`, `llama3.1`, `mistral-nemo`).

Pass `DEBUG=1` to print all requests and responses:

```bash
DEBUG=1 ./get-hostname.sh
```
