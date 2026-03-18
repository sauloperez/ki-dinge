import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from './agent.js';

const { mockSend, mockGitStatus, mockGitDiff } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockGitStatus: vi.fn(),
  mockGitDiff: vi.fn(),
}));

vi.mock('@openrouter/sdk', () => ({
  OpenRouter: vi.fn().mockImplementation(class {
    chat = { send: mockSend };
  }),
}));

vi.mock('./tools.js', () => ({
  TOOL_MAPPING: {
    gitStatus: mockGitStatus,
    gitDiff: mockGitDiff,
  },
}));

const makeConfig = (overrides: object = {}) => ({
  model: 'test-model',
  tools: [],
  messages: [{ role: 'user' as const, content: 'hello' }],
  ...overrides,
});

const assistantMessage = (content: string) => ({
  role: 'assistant' as const,
  content,
  toolCalls: undefined,
});

const assistantMessageWithToolCall = (toolName: string, args: object = {}) => ({
  role: 'assistant' as const,
  content: '',
  toolCalls: [
    {
      id: 'call-1',
      type: 'function' as const,
      function: { name: toolName, arguments: JSON.stringify(args) },
    },
  ],
});

const chatResponse = (message: object) => ({
  choices: [{ message }],
});

describe('Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generate()', () => {
    it('returns the assistant message when there are no tool calls', async () => {
      const finalMessage = assistantMessage('Here is your answer');
      mockSend.mockResolvedValueOnce(chatResponse(finalMessage));

      const agent = new Agent(makeConfig());
      const result = await agent.generate();

      expect(result).toEqual(finalMessage);
    });

    it('calls the requested tool and continues when tool calls are present', async () => {
      const toolCallMessage = assistantMessageWithToolCall('gitStatus');
      const finalMessage = assistantMessage('Done');

      mockSend
        .mockResolvedValueOnce(chatResponse(toolCallMessage))
        .mockResolvedValueOnce(chatResponse(finalMessage));

      mockGitStatus.mockResolvedValueOnce('{"current":"main"}');

      const agent = new Agent(makeConfig());
      const result = await agent.generate();

      expect(mockGitStatus).toHaveBeenCalledOnce();
      expect(result).toEqual(finalMessage);
    });

    it('appends tool response to messages before the next chat call', async () => {
      const toolCallMessage = assistantMessageWithToolCall('gitDiff');
      const finalMessage = assistantMessage('Done');

      mockSend
        .mockResolvedValueOnce(chatResponse(toolCallMessage))
        .mockResolvedValueOnce(chatResponse(finalMessage));

      mockGitDiff.mockResolvedValueOnce('diff output');

      const agent = new Agent(makeConfig());
      await agent.generate();

      const secondCallMessages = mockSend.mock.calls[1][0].chatGenerationParams.messages;
      const toolResponseMessage = secondCallMessages.find(
        (m: { role: string }) => m.role === 'tool',
      );

      expect(toolResponseMessage).toBeDefined();
      expect(toolResponseMessage.content).toBe(JSON.stringify('diff output'));
    });

    it('stops after MAX_ITERATIONS when the model keeps requesting tool calls', async () => {
      const toolCallMessage = assistantMessageWithToolCall('gitStatus');
      mockSend.mockResolvedValue(chatResponse(toolCallMessage));
      mockGitStatus.mockResolvedValue('{}');

      const agent = new Agent(makeConfig());
      await agent.generate();

      expect(mockSend).toHaveBeenCalledTimes(10);
    });
  });

  describe('chat()', () => {
    it('sends the configured model and tools', async () => {
      const config = makeConfig({ model: 'my-model', tools: [{ type: 'function' as const, function: { name: 'gitStatus', description: '', parameters: {} } }] });
      const finalMessage = assistantMessage('ok');
      mockSend.mockResolvedValueOnce(chatResponse(finalMessage));

      const agent = new Agent(config);
      await agent.generate();

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          chatGenerationParams: expect.objectContaining({
            model: 'my-model',
            tools: config.tools,
          }),
        }),
      );
    });

    it('includes the assistant response in messages for subsequent calls', async () => {
      const toolCallMessage = assistantMessageWithToolCall('gitStatus');
      const finalMessage = assistantMessage('response');

      mockSend
        .mockResolvedValueOnce(chatResponse(toolCallMessage))
        .mockResolvedValueOnce(chatResponse(finalMessage));
      mockGitStatus.mockResolvedValueOnce('{}');

      const agent = new Agent(makeConfig());
      await agent.generate();

      const secondCallMessages = mockSend.mock.calls[1][0].chatGenerationParams.messages;
      const assistantTurn = secondCallMessages.find(
        (m: { role: string }) => m.role === 'assistant',
      );
      expect(assistantTurn).toMatchObject(toolCallMessage);
    });
  });

  describe('getToolResponse()', () => {
    it('calls the correct tool from TOOL_MAPPING and returns a tool message', async () => {
      const toolCallMessage = assistantMessageWithToolCall('gitStatus');
      const finalMessage = assistantMessage('Done');

      mockSend
        .mockResolvedValueOnce(chatResponse(toolCallMessage))
        .mockResolvedValueOnce(chatResponse(finalMessage));

      mockGitStatus.mockResolvedValueOnce('status result');

      const agent = new Agent(makeConfig());
      await agent.generate();

      const secondCallMessages = mockSend.mock.calls[1][0].chatGenerationParams.messages;
      const toolResponse = secondCallMessages.find((m: { role: string }) => m.role === 'tool');

      expect(toolResponse.toolCallId).toBe('call-1');
      expect(toolResponse.content).toBe(JSON.stringify('status result'));
    });
  });
});
