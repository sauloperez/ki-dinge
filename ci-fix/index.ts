// ci-fix/index.ts
import { config } from 'dotenv';
import { existsSync, createWriteStream, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';
import chalk from 'chalk';
import { createCiTools } from './tools/ci-tools.ts';
import { createSandboxTools } from './tools/sandbox-tools.ts';
import { createGitHubTools } from './tools/github-tools.ts';
import { createSandbox, destroySandbox, setupProject, initGitCredentials } from './sandbox.ts';
import { runAgent } from './agent.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ quiet: true });

// --- Parse CLI args ---
const rawArgs = process.argv.slice(2);
const { values } = parseArgs({
  args: rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs,
  options: {
    repo: { type: 'string' },
    branch: { type: 'string' },
    build: { type: 'string' },
    scenario: { type: 'string' },
  },
});

const repo = values.repo;
const branch = values.branch;
const scenario = values.scenario;
const model = process.env.MODEL || 'openrouter/free';

// --- Validate args ---
if (!repo || !branch) {
  console.error(chalk.red('Usage: tsx index.ts --repo org/repo --branch branch-name [--scenario test-failure]'));
  process.exit(1);
}

if (!scenario && !values.build) {
  console.error(chalk.red('Either --scenario or --build is required.'));
  process.exit(1);
}

// --- Validate scenario fixtures exist ---
if (scenario) {
  const fixtureDir = join(__dirname, 'fixtures', scenario);
  if (!existsSync(fixtureDir)) {
    const available = ['test-failure', 'lint-error'];
    console.error(chalk.red(`Scenario "${scenario}" not found. Available: ${available.join(', ')}`));
    process.exit(1);
  }
}

// --- Preflight checks ---
function checkDocker(): boolean {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!checkDocker()) {
  console.error(chalk.red('Docker is not running. Please start Docker and try again.'));
  process.exit(1);
}

const aiGatewayKey = process.env.AI_GATEWAY_API_KEY;
if (!aiGatewayKey) {
  console.error(chalk.red('AI_GATEWAY_API_KEY environment variable is required.'));
  process.exit(1);
}

const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken) {
  console.error(chalk.red('GITHUB_TOKEN environment variable is required.'));
  process.exit(1);
}

// --- Main ---
async function main() {
  const logFile = join(__dirname, 'logs', `ci-fix-${Date.now()}.log`);
  mkdirSync(join(__dirname, 'logs'), { recursive: true });
  const logStream = createWriteStream(logFile, { flags: 'a' });
  const log = (msg: string) => logStream.write(msg + '\n');

  console.log(`\n${chalk.bold('CI Fix Agent')} ${chalk.dim('-- autonomous CI failure diagnosis and repair')}\n`);
  console.log(`${chalk.cyan('Repo:')}     ${repo}`);
  console.log(`${chalk.cyan('Branch:')}   ${branch}`);
  console.log(`${chalk.cyan('Scenario:')} ${scenario || 'live'}`);
  console.log(`${chalk.cyan('Model:')}    ${model}`);
  console.log(`${chalk.cyan('Log:')}      ${logFile}\n`);

  // 1. Start sandbox
  console.log(chalk.dim('Starting Docker sandbox...'));
  const containerId = await createSandbox({ githubToken: githubToken! });
  console.log(chalk.dim(`Sandbox ready: ${containerId.substring(0, 12)}`));

  // Initialize git credentials for push authentication
  await initGitCredentials(containerId);

  console.log(chalk.dim(`Setting up ${repo}@${branch}...`));
  await setupProject(containerId, repo!, branch!);
  console.log(chalk.dim('Project ready.') + '\n');

  let tornDown = false;
  const teardown = async () => {
    if (tornDown) return;
    tornDown = true;
    console.log('\n' + chalk.dim('Tearing down sandbox...'));
    await destroySandbox(containerId);
  };

  process.on('SIGINT', async () => {
    await teardown();
    process.exit(0);
  });

  try {
    // 2. Build tools
    const tools = {
      ...(scenario ? createCiTools({ scenario }) : {}),
      ...createSandboxTools({ containerId }),
      ...createGitHubTools({ token: githubToken! }),
    };

    // 3. Run agent
    await runAgent({ model, tools, repo: repo!, branch: branch!, log });

    console.log(chalk.green(chalk.bold('Agent complete.')));
  } finally {
    // 4. Tear down sandbox
    await teardown();
    logStream.end();
  }
}

main().catch((err) => {
  console.error(chalk.red(`Fatal: ${err.message}`));
  process.exit(1);
});
