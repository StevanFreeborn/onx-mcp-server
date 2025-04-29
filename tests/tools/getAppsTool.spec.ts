import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getAppsTool } from "../../src/tools";

describe("getAppsTool", () => {
  const OnspringClient = vi.fn();
  const mockClient = new OnspringClient();
  const handlerExtras = {
    signal: new AbortController().signal,
    sessionId: undefined,
  };

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  test("it should require an onspring client", () => {
    expect(() => getAppsTool(null as any)).toThrowError();
  });

  test("it should return a function", () => {
    const tool = getAppsTool(mockClient);

    expect(typeof tool).toBe("function");
  });

  test("it should return an error message when fails to get apps", async () => {
    const tool = getAppsTool(mockClient);

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: false,
      message: "Oh no!",
      statusCode: 500,
    });

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: "Unable to get apps: Oh no! (500)",
        },
      ],
    });
  });

  test("it should return an error message when there is no data", async () => {
    const tool = getAppsTool(mockClient);

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      message: "Oh no!",
      statusCode: 200,
      data: null,
    });

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: "Unable to get apps: Oh no! (200)",
        },
      ],
    });
  });

  test("it should return an error message if getApps throws an error", async () => {
    const tool = getAppsTool(mockClient);

    mockClient.getApps = vi.fn().mockRejectedValue(new Error("Oh no!"));

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: "Unable to get apps: Oh no!",
        },
      ],
    });
  });

  test("it should return a list of apps when getApps is successful and has one page", async () => {
    const tool = getAppsTool(mockClient);

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      message: "Oh no!",
      statusCode: 200,
      data: {
        items: [
          { id: 1, name: "App 1" },
          { id: 2, name: "App 2" },
        ],
        totalPages: 1,
      },
    });

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(["App 1", "App 2"]),
        },
      ],
    });
  });

  test("it should return a list of apps when getApps is successful and has multiple pages", async () => {
    const tool = getAppsTool(mockClient);

    mockClient.getApps = vi
      .fn()
      .mockResolvedValueOnce({
        isSuccessful: true,
        message: "Oh no!",
        statusCode: 200,
        data: {
          items: [
            { id: 1, name: "App 1" },
            { id: 2, name: "App 2" },
          ],
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        isSuccessful: true,
        message: "Oh no!",
        statusCode: 200,
        data: {
          items: [
            { id: 3, name: "App 3" },
            { id: 4, name: "App 4" },
          ],
          totalPages: 2,
        },
      });

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(["App 1", "App 2", "App 3", "App 4"]),
        },
      ],
    });
  });
});

