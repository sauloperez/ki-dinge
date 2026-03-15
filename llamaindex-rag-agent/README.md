# LlamaIndex RAG Agent

A simple Retrieval-Augmented Generation (RAG) agent that uses LlamaIndex to search through Paul Graham essays and answer questions about them.

## Setup

1. Copy `.env.example` to `.env` and add your API key:
   ```bash
   cp .env.example .env
   # Edit .env and add your ANTHROPIC_API_KEY
   ```

2. Install dependencies (requires Python 3.11+):
   ```bash
   uv sync
   ```

## Running

**Important**: Run the script from within the project directory so relative paths resolve correctly:

```bash
cd projects/llamaindex-rag-agent
uv run python src/starter.py
```

The agent will:
1. Load the Paul Graham essay from `data/`
2. Create a vector index (stored in `storage/` — gitignored)
3. Answer questions about the essay using the RAG system

## Example

The script demonstrates querying: "What did the author do in college? Also, what's 7 * 8?"

It will use:
- **HuggingFace embeddings** for document processing
- **Anthropic Claude** (Haiku) for LLM responses
- **LlamaIndex workflows** to combine tools (document search + calculation)
