# ki-dinge Monorepo Guidelines

This is a monorepo for LLM/AI Agent Proof of Concepts. Each PoC lives in its own folder with independent implementation and documentation.

## Creating a New PoC

### 1. Create the folder

```bash
mkdir <poc-name>
cd <poc-name>
```

### 2. Implement the PoC

Create your implementation files in the appropriate language:
- Shell scripts (`.sh`)
- Python (`.py`)
- TypeScript/Node.js (`.ts`, `.js`)
- Other languages as needed

Keep the implementation focused and minimal.

### 3. Create a README.md

Document the PoC with:
- **Title**: Descriptive name
- **Overview**: What the PoC demonstrates
- **How it works**: Technical explanation of the approach
- **Usage**: Step-by-step instructions to run it

Example structure:

```markdown
# Your PoC Name

One sentence description of what it demonstrates.

## How it works

Technical explanation of the implementation.

## Usage

1. Prerequisites (dependencies, environment setup)
2. Installation steps
3. Run the PoC with examples
```

## Examples

- **prompt-script/** — Simple, hardcoded prompt streaming
- **top3-query/** — Parametrized prompt generation with arguments

## Conventions

- Keep each PoC self-contained and independently runnable
- Include clear usage instructions and examples
- Document the approach and trade-offs made
- Add dependency files (package.json, requirements.txt, etc.)
