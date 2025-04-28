import {
  Field,
  FieldStatus,
  FieldType,
  FormulaField,
  FormulaOutputType,
  ListField,
  Multiplicity,
} from "onspring-api-sdk";
import {
  checkConnectionTool,
  getAppsTool,
  getFieldsTool,
  getRecordsTool,
} from "../src/tools.js";

import { describe, expect, test, afterEach, vi, beforeEach } from "vitest";

describe("checkConnectionTool", () => {
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
        isError: true,
        content: [{ type: "text", text: expectedErrorMessage }],
      });
    });
  }
});

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
    expect(() => checkConnectionTool(null as any)).toThrowError();
  });

  test("it should return a function", () => {
    const tool = checkConnectionTool(mockClient);

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
      message: "Oh no!",
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

describe("getRecordsTool", () => {
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
    expect(() =>
      getRecordsTool(null as any, "appName", [], 1, 1),
    ).toThrowError();
  });

  test("it should return a function", () => {
    const tool = getRecordsTool(mockClient, "appName", [], 1, 1);

    expect(typeof tool).toBe("function");
  });

  test("it should return an error message when app is not found", async () => {
    const tool = getRecordsTool(mockClient, "appName", [], 1, 1);

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
          text: "Unable to get records: App appName not found",
        },
      ],
    });
  });

  test("it should return an error message when one or more fields are not found", async () => {
    const tool = getRecordsTool(mockClient, "users", ["status"], 1, 1);

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: "users" }],
        totalPages: 1,
      },
    });

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
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
          text: "Unable to get records: Fields status not found",
        },
      ],
    });
  });

  test("it should return an error message when fails to get records", async () => {
    const tool = getRecordsTool(mockClient, "users", ["status"], 1, 1);

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: "users" }],
        totalPages: 1,
      },
    });

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [
          { id: 1, name: "status", type: FieldType.Text },
          { id: 2, name: "name", type: FieldType.Text },
        ],
        totalPages: 1,
      },
    });

    mockClient.getRecordsByAppId = vi.fn().mockResolvedValue({
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
          text: "Unable to get records: Unable to get records for app 1 with fields 1: Oh no! (500)",
        },
      ],
    });
  });

  test("it should return an error message when there is no data", async () => {
    const tool = getRecordsTool(mockClient, "users", ["status"], 1, 1);

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: "users" }],
        totalPages: 1,
      },
    });

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [
          { id: 1, name: "status", type: FieldType.Text },
          { id: 2, name: "name", type: FieldType.Text },
        ],
        totalPages: 1,
      },
    });

    mockClient.getRecordsByAppId = vi.fn().mockResolvedValue({
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
          text: "Unable to get records: Unable to get records for app 1 with fields 1: Oh no! (200)",
        },
      ],
    });
  });

  test("it should return a list of records when getRecords is successful and has one page", async () => {});

  test("it should return a list of records when getRecords is successful and has multiple pages", async () => {});
});
