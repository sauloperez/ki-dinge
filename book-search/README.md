# Book Search

Demonstrates tool calling via the OpenRouter SDK: the model calls a `searchGutenbergBooks` tool that queries the [Project Gutenberg](https://gutendex.com) library.

## How it works

Sends the query "What are the titles of some James Joyce books?" with a `searchGutenbergBooks` tool definition. The model calls the tool with search terms, the script fetches results from the Gutendex API, and the loop continues until the model produces a final answer.

## Usage

1. Set your OpenRouter API key:

```bash
cp .env.example .env
# edit .env and add your key
```

2. Run:

```bash
pnpm install
pnpm tsx book-search.ts
```
