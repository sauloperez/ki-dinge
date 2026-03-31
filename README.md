# ki-dinge

LLM/AI Agent Proof of Concepts — a monorepo of focused experiments.

## PoCs

| PoC | Description | Stack |
|-----|-------------|-------|
| [prompt-script](./prompt-script) | Hardcoded prompt streaming via Ollama's API | Shell, Ollama |
| [top3-query](./top3-query) | Parametrized top-3 prompt generation with arguments | Shell, Ollama |
| [tool-calling](./tool-calling) | Tool calling loop: shell, TypeScript, and agentic loop variants | Shell, TypeScript, Ollama |
| [data-analyst](./data-analyst) | Conversational agent that answers questions about a SQLite database | TypeScript, AI SDK |
| [git-assistant](./git-assistant) | AI agent that answers questions about a git repo using tool calling | TypeScript, OpenRouter |
| [virtual-fs](./virtual-fs) | Coding agent with a virtual file system that loads files on demand | TypeScript, AI SDK |
| [llamaindex-rag-agent](./llamaindex-rag-agent) | RAG agent over Paul Graham essays using LlamaIndex | Python, LlamaIndex, Anthropic |
| [ci-fix](./ci-fix) | Autonomous agent that diagnoses failed CI builds and submits fix PRs | TypeScript, AI SDK, Docker, GitHub |

## Adding a new PoC

See [CLAUDE.md](./CLAUDE.md) for conventions.