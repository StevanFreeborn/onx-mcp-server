import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getRecordsTool } from '../../src/tools';
import { FieldType, Record, StringRecordValue } from 'onspring-api-sdk';

describe('getRecordsTool', () => {
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
    expect(() => getRecordsTool(null!, 'appName', [], 1, 1)).toThrowError();
  });

  test('it should return a function', () => {
    const tool = getRecordsTool(mockClient, 'appName', [], 1, 1);

    expect(typeof tool).toBe('function');
  });

  test('it should return an error message when app is not found', async () => {
    const tool = getRecordsTool(mockClient, 'appName', [], 1, 1);

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
          text: 'Unable to get records: App appName not found',
        },
      ],
    });
  });

  test('it should return an error message when one or more fields are not found', async () => {
    const tool = getRecordsTool(mockClient, 'users', ['status'], 1, 1);

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: 'users' }],
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
          type: 'text',
          text: 'Unable to get records: Fields status not found',
        },
      ],
    });
  });

  test('it should return an error message when fails to get records', async () => {
    const tool = getRecordsTool(mockClient, 'users', ['status'], 1, 1);

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: 'users' }],
        totalPages: 1,
      },
    });

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [
          { id: 1, name: 'status', type: FieldType.Text },
          { id: 2, name: 'name', type: FieldType.Text },
        ],
        totalPages: 1,
      },
    });

    mockClient.getRecordsByAppId = vi.fn().mockResolvedValue({
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
          text: 'Unable to get records: Unable to get records for app 1 with fields 1: Oh no! (500)',
        },
      ],
    });
  });

  test('it should return an error message when there is no data', async () => {
    const tool = getRecordsTool(mockClient, 'users', ['status'], 1, 1);

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: 'users' }],
        totalPages: 1,
      },
    });

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [
          { id: 1, name: 'status', type: FieldType.Text },
          { id: 2, name: 'name', type: FieldType.Text },
        ],
        totalPages: 1,
      },
    });

    mockClient.getRecordsByAppId = vi.fn().mockResolvedValue({
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
          text: 'Unable to get records: Unable to get records for app 1 with fields 1: Oh no! (200)',
        },
      ],
    });
  });

  test('it should return a list of records when getRecords is successful and has one page', async () => {
    const tool = getRecordsTool(mockClient, 'users', ['status'], 1, 1);

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: 'users' }],
        totalPages: 1,
      },
    });

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [
          { id: 1, name: 'status', type: FieldType.Text },
          { id: 2, name: 'name', type: FieldType.Text },
        ],
        totalPages: 1,
      },
    });

    const testRecords = [
      new Record(1, 1, [new StringRecordValue(1, 'active'), new StringRecordValue(2, 'John Doe')]),
      new Record(1, 2, [
        new StringRecordValue(1, 'inactive'),
        new StringRecordValue(2, 'Jane Doe'),
      ]),
    ];

    mockClient.getRecordsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: testRecords,
        totalPages: 1,
        totalRecords: 2,
      },
    });

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            appId: 1,
            records: [
              {
                recordId: 1,
                data: {
                  status: 'active',
                },
              },
              {
                recordId: 2,
                data: {
                  status: 'inactive',
                },
              },
            ],
            totalPages: 1,
            totalRecords: 2,
          }),
        },
      ],
    });
  });

  test('it should return a list of records when getRecords is successful and has multiple pages', async () => {
    const tool = getRecordsTool(mockClient, 'users', ['status'], 1, 2);

    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [{ id: 1, name: 'users' }],
        totalPages: 1,
      },
    });

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [
          { id: 1, name: 'status', type: FieldType.Text },
          { id: 2, name: 'name', type: FieldType.Text },
        ],
        totalPages: 1,
      },
    });

    const testRecords = [
      new Record(1, 1, [new StringRecordValue(1, 'active'), new StringRecordValue(2, 'John Doe')]),
      new Record(1, 2, [
        new StringRecordValue(1, 'inactive'),
        new StringRecordValue(2, 'Jane Doe'),
      ]),
    ];

    mockClient.getRecordsByAppId = vi
      .fn()
      .mockResolvedValueOnce({
        isSuccessful: true,
        statusCode: 200,
        data: {
          items: [testRecords[0]],
          totalPages: 2,
          totalRecords: 2,
        },
      })
      .mockResolvedValueOnce({
        isSuccessful: true,
        statusCode: 200,
        data: {
          items: [testRecords[1]],
          totalPages: 2,
          totalRecords: 2,
        },
      });

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            appId: 1,
            records: [
              {
                recordId: 1,
                data: {
                  status: 'active',
                },
              },
              {
                recordId: 2,
                data: {
                  status: 'inactive',
                },
              },
            ],
            totalPages: 2,
            totalRecords: 2,
          }),
        },
      ],
    });
  });
});
