import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getFieldsTool } from "../../src/tools";
import { Field, FieldStatus, FieldType, FormulaField, FormulaOutputType, ListField, Multiplicity } from "onspring-api-sdk";

describe("getFieldsTool", () => {
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
    expect(() => getFieldsTool(null as any, "")).toThrowError();
  });

  test("it should return a function", () => {
    const tool = getFieldsTool(mockClient, "");

    expect(typeof tool).toBe("function");
  });

  test("it should return an error message when app is not found", async () => {
    const tool = getFieldsTool(mockClient, "App 1");

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [],
        totalPages: 1,
      },
    });

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: "Unable to get fields: App App 1 not found",
        },
      ],
    });
  });

  test("it should return an error message when fails to get fields", async () => {
    const tool = getFieldsTool(mockClient, "App 1");

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: "App 1" }],
        totalPages: 1,
      },
    });

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
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
          text: "Unable to get fields: Oh no! (500)",
        },
      ],
    });
  });

  test("it should return an error message when there is no data", async () => {
    const tool = getFieldsTool(mockClient, "App 1");

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: "App 1" }],
        totalPages: 1,
      },
    });

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
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
          text: "Unable to get fields: Oh no! (200)",
        },
      ],
    });
  });

  test("it should return an error message if getFields throws an error", async () => {
    const tool = getFieldsTool(mockClient, "App 1");

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: "App 1" }],
        totalPages: 1,
      },
    });

    mockClient.getFieldsByAppId = vi
      .fn()
      .mockRejectedValue(new Error("Oh no!"));

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: "Unable to get fields: Oh no!",
        },
      ],
    });
  });

  test("it should return a list of fields when getFields is successful and has one page", async () => {
    const tool = getFieldsTool(mockClient, "App 1");

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: "App 1" }],
        totalPages: 1,
      },
    });

    const testFields = [
      new Field(
        1,
        1,
        "Field 1",
        FieldType.Text,
        FieldStatus.Enabled,
        false,
        false,
      ),
      new Field(
        2,
        1,
        "Field 2",
        FieldType.Text,
        FieldStatus.Enabled,
        false,
        false,
      ),
      new ListField(
        4,
        1,
        "Field 3",
        FieldType.List,
        FieldStatus.Enabled,
        false,
        false,
        Multiplicity.SingleSelect,
        1,
        [],
      ),
      new FormulaField(
        5,
        1,
        "Field 4",
        FieldType.Formula,
        FieldStatus.Enabled,
        false,
        false,
        FormulaOutputType.DateAndTime,
        [],
      ),
    ];

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: testFields,
        totalPages: 1,
      },
    });

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify([
            { id: 1, name: "Field 1", type: "Text" },
            { id: 2, name: "Field 2", type: "Text" },
            { id: 4, name: "Field 3", type: "SingleSelect List" },
            { id: 5, name: "Field 4", type: "DateAndTime Formula" },
          ]),
        },
      ],
    });
  });

  test("it should return a list of fields when getFields is successful and has multiple pages", async () => {
    const tool = getFieldsTool(mockClient, "App 1");

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: "App 1" }],
        totalPages: 1,
      },
    });

    const testFields = [
      { id: 1, name: "Field 1", type: "Text" },
      { id: 2, name: "Field 2", type: "Text" },
      { id: 3, name: "Field 3", type: "Text" },
      { id: 4, name: "Field 4", type: "Text" },
    ];

    mockClient.getFieldsByAppId = vi
      .fn()
      .mockResolvedValueOnce({
        isSuccessful: true,
        message: "Oh no!",
        statusCode: 200,
        data: {
          items: [testFields[0], testFields[1]],
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        isSuccessful: true,
        message: "Oh no!",
        statusCode: 200,
        data: {
          items: [testFields[2], testFields[3]],
          totalPages: 2,
        },
      });

    const result = await tool(handlerExtras);

    expect(result).toMatchObject({
      content: [
        {
          type: "text",
          text: JSON.stringify(testFields),
        },
      ],
    });
  });
});
