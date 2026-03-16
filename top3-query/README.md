# Top 3 Query PoC

A parametrized version of the simple prompt script that queries for the top 3 of any category.

## Overview

This example demonstrates how to send a dynamic prompt to an LLM and stream back a formatted response. The script takes a noun as input, queries the LLM for the top 3 of that category, and processes the streamed output for proper presentation.

## How it works

This PoC streams LLM responses and post-processes the output with `jq` to:
- Concatenate streaming tokens while preserving formatting (lists, paragraphs, enumerations)
- Clean up excess whitespace

It uses Ollama's API for the sake of convenience and cost savings, but it can be replaced with any LLM API that supports streaming responses, such as Anthropic's messages API.

## Usage

1. Ensure Ollama is running locally: `ollama serve`
2. Pull a model (if not already available): `ollama pull llama3.2`
3. Run the script with a noun argument:
   ```bash
   ./top3.sh alpinists
   ./top3.sh cooks
   ./top3.sh scientists
   ```

The script defaults to "alpinists" if no argument is provided. It will stream the response and output formatted text.
