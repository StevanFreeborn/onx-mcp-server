import { checkConnectionTool } from "../src/tools.js";
import { describe, expect, test, afterEach, vi } from "vitest";

describe("checkConnectionTool", () => {
  const OnspringClient = vi.fn();
  const mockClient = new OnspringClient();
  const handlerExtras = {
    signal: new AbortController().signal,
    sessionId: undefined,
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("it should require an onspring client", () => {
    expect(() => checkConnectionTool(null as any)).toThrowError();
  });

  test("it should return a function", () => {
    const tool = checkConnectionTool(mockClient);

    expect(typeof tool).toBe("function");
  });

  test("it should return not connected when canConnect is false", async () => {
    const tool = checkConnectionTool(mockClient);

    mockClient.canConnect = vi.fn().mockResolvedValue(false);

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      content: [{ type: "text", text: "Not connected" }],
    });
  });

  test("it should return connected when canConnect is true", async () => {
    const tool = checkConnectionTool(mockClient);

    mockClient.canConnect = vi.fn().mockResolvedValue(true);

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      content: [{ type: "text", text: "Connected" }],
    });
  });

  for (const error of [new Error(), new Error("Oh no!")]) {
    test("it should return an error message when canConnect throws an error", async () => {
      const tool = checkConnectionTool(mockClient);

      mockClient.canConnect = vi.fn().mockRejectedValue(error);

      const result = await tool(handlerExtras);

      let expectedErrorMessage = "Unable to connect to Onspring";

      if (error instanceof Error && error.message) {
        expectedErrorMessage = expectedErrorMessage + ": " + error.message;
      }

      expect(result).toEqual({
        content: [{ type: "text", text: expectedErrorMessage }],
      });
    });
  }
});
