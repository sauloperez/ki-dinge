Update the PoC table in the root README.md to include any new proof-of-concept directories.

**Step-by-step process:**

1. **Read** the current `README.md` file to see the existing table
2. **List** all top-level directories: `ls -la`
3. **Skip** these directories: `.github`, `.agents`, `.claude`, `node_modules`, `docs`, `data`, `.git`, `claude-ci`
4. **For each remaining directory:**
   - Check if it has a `README.md` file
   - Check if it's already in the PoC table
   - If it's new, extract: folder name, title (H1 heading), description (first paragraph), tech stack
5. **Edit** the root `README.md` to add new entries to the PoC table

**Rules:**
- Only modify the root `README.md` file
- Only add new rows to the existing table - don't modify existing entries
- Maintain the current table format: `| [name](./folder) | Description | Stack |`
- Keep descriptions to one sentence
- If no new PoCs exist, don't make any changes

**Use the Read, Write, and Edit tools to examine files and make changes.**
