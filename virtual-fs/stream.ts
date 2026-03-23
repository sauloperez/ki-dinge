const ansi = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
};

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

class Spinner {
  private frame: number;
  private interval: NodeJS.Timeout | undefined;

  constructor() {
    this.frame = 0;
  }

  public start() {
    this.interval = setInterval(() => {
      process.stdout.write(`\r${ansi.dim}${SPINNER_FRAMES[this.frame++ % SPINNER_FRAMES.length]} Thinking...${ansi.reset}`);
    }, 80);
  }

  public stop() {
    clearInterval(this.interval);
  }
}


export const streamResponse = async (result: { textStream: AsyncIterable<string> }): Promise<string> => {
  const spinner = new Spinner();
  spinner.start();

  let fullText = '';
  let first = true;
  for await (const chunk of result.textStream) {
    if (first) {
      spinner.stop();
      process.stdout.write(`\r\x1b[K\n${ansi.green}${ansi.bold}Agent${ansi.reset} › `);
      first = false;
    }
    process.stdout.write(chunk);
    fullText += chunk;
  }

  if (first) {
    spinner.stop();
    process.stdout.write(`\r\x1b[K\n${ansi.green}${ansi.bold}Agent${ansi.reset} › `);
  }

  process.stdout.write('\n');
  return fullText;
};
