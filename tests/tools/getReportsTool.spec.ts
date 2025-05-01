import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getReportsTool } from '../../src/tools';

describe('getReportsTool', () => {
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
    expect(() => getReportsTool(null!, 'appName')).toThrowError();
  });

  test('it should return a function', () => {
    const tool = getReportsTool(mockClient, 'appName');

    expect(typeof tool).toBe('function');
  });

  test('it should return an error message when app is not found', async () => {
    const tool = getReportsTool(mockClient, 'appName');

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
          type: 'text',
          text: 'Unable to get reports: App appName not found',
        },
      ],
    });
  });

  test('it should return an error message when fails to get reports', async () => {
    const tool = getReportsTool(mockClient, 'appName');

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: 'appName' }],
        totalPages: 1,
      },
    });

    mockClient.getReportsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: false,
      message: 'Oh no!',
      statusCode: 500,
    });

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Unable to get reports: Oh no! (500)',
        },
      ],
    });
  });

  test('it should return an error message when there is no data', async () => {
    const tool = getReportsTool(mockClient, 'appName');

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: 'appName' }],
        totalPages: 1,
      },
    });

    mockClient.getReportsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      message: 'Oh no!',
      statusCode: 200,
      data: null,
    });

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Unable to get reports: Oh no! (200)',
        },
      ],
    });
  });

  test('it should return a list of reports when getReports is successful and has one page', async () => {
    const tool = getReportsTool(mockClient, 'appName');

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: 'appName' }],
        totalPages: 1,
      },
    });

    const testReports = [
      { id: 1, name: 'Report 1' },
      { id: 2, name: 'Report 2' },
    ];

    mockClient.getReportsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: testReports,
        totalPages: 1,
      },
    });

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(testReports.map(report => report.name)),
        },
      ],
    });
  });

  test('it should return a list of reports when getReports is successful and has multiple pages', async () => {
    const tool = getReportsTool(mockClient, 'appName');

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: 'appName' }],
        totalPages: 1,
      },
    });

    const testReports = [
      { id: 1, name: 'Report 1' },
      { id: 2, name: 'Report 2' },
      { id: 3, name: 'Report 3' },
      { id: 4, name: 'Report 4' },
    ];

    mockClient.getReportsByAppId = vi
      .fn()
      .mockResolvedValueOnce({
        isSuccessful: true,
        statusCode: 200,
        data: {
          items: [testReports[0], testReports[1]],
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        isSuccessful: true,
        statusCode: 200,
        data: {
          items: [testReports[2], testReports[3]],
          totalPages: 2,
        },
      });

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(testReports.map(report => report.name)),
        },
      ],
    });
  });
});
