# Simple Prompt PoC

This example demonstrates how to send a prompt to an LLM and stream back a formatted response. The script sends a hardcoded prompt to a local LLM API and processes the streamed output for proper presentation.

## How it works

This PoC streams LLM responses and post-processes the output with `jq` and `sed` to:
- Concatenate streaming tokens while preserving formatting (lists, paragraphs, enumerations)
- Clean up excess whitespace

It uses Ollama's API for the sake of convenience and cost savings, but it can be replaced with any LLM API that supports streaming responses, such as Anthropic's messages API.

## Usage

1. Ensure Ollama is running locally: `ollama serve`
2. Pull a model (if not already available): `ollama pull llama3.2`
3. Run the script: `./main.sh`

The script will stream the response and output formatted text.
