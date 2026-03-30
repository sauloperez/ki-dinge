You are maintaining the root README.md for a monorepo of LLM/AI Agent PoCs.

## Task

1. List all top-level directories in this repo.
2. Skip these directories: .github, .agents, .claude, node_modules, docs, data, .git
3. For each remaining directory that contains a README.md, extract:
   - **Folder name** (used for the link)
   - **Title**: the first H1 heading from its README.md
   - **Summary**: the first sentence or paragraph right after the H1 (one line max)
   - **Stack**: infer from files present (package.json → check dependencies; pyproject.toml → Python; .sh files → Shell; etc.)
4. Sort the PoCs by complexity: simplest first (shell scripts), then TypeScript, then Python, then multi-tool projects.

## Output

Write a file called `README.md` at the repo root with exactly this structure:

```markdown
# ki-dinge

LLM/AI Agent Proof of Concepts — a monorepo of focused experiments.

## PoCs

| PoC | Description | Stack |
|-----|-------------|-------|
| [folder-name](./folder-name) | One-line description | Stack items |
...

## Adding a new PoC

See [CLAUDE.md](./CLAUDE.md) for conventions.
```

## Rules

- Do NOT modify any file other than the root README.md
- Do NOT invent PoCs that don't exist — only list directories that actually have a README.md
- Keep descriptions concise (one sentence)
- The table must link to each PoC folder
