import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getReportDataTool } from "../../src/tools";

describe("getReportDataTool", () => {
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

  test('it should require an onspring client', () => {
    expect(() => getReportDataTool(null as any, "appName", "reportName")).toThrowError();
  });

  test('it should return a function', () => {
    const tool = getReportDataTool(mockClient, "appName", "reportName");

    expect(typeof tool).toBe("function");
  });

  test('it should return an error message when app is not found', async () => {
    const tool = getReportDataTool(mockClient, "appName", "reportName");

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
          text: "Unable to get report data: App appName not found",
        },
      ],
    });
  });

  test('it should return an error message when report is not found', async () => {
    const tool = getReportDataTool(mockClient, "appName", "reportName");

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: "appName" }],
        totalPages: 1,
      },
    });

    mockClient.getReportsByAppId = vi.fn().mockResolvedValue({
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
          text: "Unable to get report data: Report reportName not found",
        },
      ],
    });
  });

  test('it should return an error message when fails to get report data', async () => {
    const tool = getReportDataTool(mockClient, "appName", "reportName");

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: "appName" }],
        totalPages: 1,
      },
    });

    mockClient.getReportsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: "reportName" }],
        totalPages: 1,
      },
    });

    mockClient.getReportById = vi.fn().mockResolvedValue({
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
          text: "Unable to get report data: Oh no! (500)",
        },
      ],
    });
  });

  test('it should return an error message when there is no data', async () => {
    const tool = getReportDataTool(mockClient, "appName", "reportName");

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: "appName" }],
        totalPages: 1,
      },
    });

    mockClient.getReportsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: "reportName" }],
        totalPages: 1,
      },
    });

    mockClient.getReportById = vi.fn().mockResolvedValue({
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
          text: "Unable to get report data: Oh no! (200)",
        },
      ],
    });
  });

  test('it should return a list of records when retrieving report data is successful and data', async () => {
    const tool = getReportDataTool(mockClient, "appName", "reportName");

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: "appName" }],
        totalPages: 1,
      },
    });

    mockClient.getReportsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: "reportName" }],
        totalPages: 1,
      },
    });

    const testReportData = {
      columns: [
        'status',
        'name',
      ],
      rows: [
        {
          recordId: 1,
          cells: [
            'active',
            'John Doe',
          ]
        },
        {
          recordId: 2,
          cells: [
            'inactive',
            'Jane Doe',
          ]
        },
      ]
    };

    mockClient.getReportById = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: testReportData,
    });

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify([
            {
              recordId: 1,
              data: {
                status: 'active',
                name: 'John Doe',
              },
            },
            {
              recordId: 2,
              data: {
                status: 'inactive',
                name: 'Jane Doe',
              },
            },
          ]),
        },
      ],
    });
  });
});
