import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { checkConnectionTool } from '../../src/tools';

describe('checkConnectionTool', () => {
  const OnspringClient = vi.fn();
  const mockClient = new OnspringClient();
  const handlerExtras = {
    signal: new AbortController().signal,
    sessionId: undefined,
  };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  test('it should require an onspring client', () => {
    expect(() => checkConnectionTool(null!)).toThrowError();
  });

  test('it should return a function', () => {
    const tool = checkConnectionTool(mockClient);

    expect(typeof tool).toBe('function');
  });

  test('it should return not connected when canConnect is false', async () => {
    const tool = checkConnectionTool(mockClient);

    mockClient.canConnect = vi.fn().mockResolvedValue(false);

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      content: [{ type: 'text', text: 'Not connected' }],
    });
  });

  test('it should return connected when canConnect is true', async () => {
    const tool = checkConnectionTool(mockClient);

    mockClient.canConnect = vi.fn().mockResolvedValue(true);

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      content: [{ type: 'text', text: 'Connected' }],
    });
  });

  for (const error of [new Error(), new Error('Oh no!')]) {
    test('it should return an error message when canConnect throws an error', async () => {
      const tool = checkConnectionTool(mockClient);

      mockClient.canConnect = vi.fn().mockRejectedValue(error);

      const result = await tool(handlerExtras);

      let expectedErrorMessage = 'Unable to check connection';

      if (error instanceof Error && error.message) {
        expectedErrorMessage = expectedErrorMessage + ': ' + error.message;
      }

      expect(result).toEqual({
        isError: true,
        content: [{ type: 'text', text: expectedErrorMessage }],
      });
    });
  }
});
