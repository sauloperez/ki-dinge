import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { streamResponse } from './stream.ts';

describe('streamResponse', () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('returns the full text collected while streaming', async () => {
    const chunks = ['Hello', ', ', 'world'];
    const fakeResult = {
      textStream: (async function* () {
        for (const chunk of chunks) yield chunk;
      })(),
    };

    const text = await streamResponse(fakeResult as any);
    expect(text).toBe('Hello, world');
  });

  test('returns empty string when stream produces no chunks', async () => {
    const fakeResult = {
      textStream: (async function* () {})(),
    };

    const text = await streamResponse(fakeResult as any);
    expect(text).toBe('');
  });
});
