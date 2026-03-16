# Tool Calling PoC

Demonstrates the tool calling (function calling) loop using Ollama's chat API.

## How it works

The script sends a user query to the model along with a tool definition (`get_hostname`). If the model decides to call the tool, the script:

1. Detects the tool call in the model's response
2. Executes the tool locally (`hostname`)
3. Sends the result back to the model in a follow-up message
4. Prints the model's final answer

This illustrates the core agentic pattern: model requests a tool → host executes it → model uses the result.

## Usage

1. Ensure Ollama is running locally: `ollama serve`
2. Pull a supported model: `ollama pull qwen2.5:7b`
3. Run it:
   ```bash
   ./tool-calling.sh
   ./tool-calling.sh llama3.2
   ```

The model defaults to `qwen2.5:7b`. Not all Ollama models support tool calling — use one that does (e.g., `qwen2.5:7b`, `llama3.1`, `mistral-nemo`).
