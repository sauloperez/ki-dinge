# Git Assistant

An AI agent that answers questions about a git repository using tool calling.

## How it works

The assistant is given three tools — `gitDiff`, `gitStatus`, and `gitLog` — backed by the `simple-git` library. It uses the `Agent` class to run an agentic loop via OpenRouter, calling tools as needed until it can answer the user's question.

## Usage

1. Set your OpenRouter API key:
   ```bash
   export OPENROUTER_API_KEY=your_key_here
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Ask a question about the current repository:
   ```bash
   pnpm start --prompt "What files changed in the last commit?"
   pnpm start --prompt "Do I have any staged changes?"
   pnpm start --prompt "When was the last time foo.ts was modified?"
   ```

Pass `--debug` to print all model requests and responses:
```bash
pnpm start --prompt "What's the latest commit?" --debug
```
