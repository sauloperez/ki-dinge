You are updating the PoC table in the existing root README.md for a monorepo of LLM/AI Agent PoCs.

## Task

1. Read the existing `README.md` at the repo root.
2. List all top-level directories in this repo.
3. Skip these directories: .github, .agents, .claude, node_modules, docs, data, .git
4. For each remaining directory that contains a README.md **and is not already in the table**, extract:
   - **Folder name** (used for the link)
   - **Title**: the first H1 heading from its README.md
   - **Summary**: the first sentence or paragraph right after the H1 (one line max)
   - **Stack**: infer from files present (package.json → check dependencies; pyproject.toml → Python; .sh files → Shell; etc.)
5. Append new entries to the existing PoC table, maintaining the sort order by complexity: simplest first (shell scripts), then TypeScript, then Python, then multi-tool projects.

## Rules

- Do NOT modify any file other than the root README.md
- Do NOT rewrite the entire file — only append new rows to the existing PoC table
- Do NOT remove or alter existing table entries
- Do NOT invent PoCs that don't exist — only list directories that actually have a README.md
- Keep descriptions concise (one sentence)
- Each new row must link to the PoC folder
- If there are no new PoCs to add, make no changes
