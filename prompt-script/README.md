# Simple Prompt PoC

This example demonstrates how to generate a response based on user input. The script takes a user prompt and uses a basic LLM API to respond to it.

## How it works

This PoC streams LLM responses and post-processes the output with `jq` and `sed` for presentation purposes. It uses Ollama's API for the sake of convenience and cost savings, but it can be replaced with any LLM API that supports streaming responses, such as Anthropic's messages API.
