const ansi = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
};

export const streamResponse = async (result: { textStream: AsyncIterable<string> }): Promise<string> => {
  process.stdout.write(`\n${ansi.green}${ansi.bold}Agent${ansi.reset} › `);
  let fullText = '';
  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
    fullText += chunk;
  }
  process.stdout.write('\n');
  return fullText;
};
