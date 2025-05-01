import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getFileTool } from '../../src/tools';

import {
  Attachment,
  AttachmentListRecordValue,
  Field,
  FieldStatus,
  FieldType,
  File,
  FileStorageSite,
} from 'onspring-api-sdk';

import { Readable } from 'stream';

describe('getFileTool', () => {
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
    expect(() => getFileTool(null!, 'appName', 'fieldName', 1, 'fileName')).toThrowError();
  });

  test('it should return a function', () => {
    const tool = getFileTool(mockClient, 'appName', 'fieldName', 1, 'fileName');

    expect(typeof tool).toBe('function');
  });

  test('it should return an error message when app is not found', async () => {
    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [],
        totalPages: 1,
      },
    });

    const tool = getFileTool(mockClient, 'appName', 'fieldName', 1, 'fileName');

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Unable to get file: App appName not found',
        },
      ],
    });
  });

  test('it should return an error message when field is not found', async () => {
    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [
          {
            id: 1,
            name: 'appName',
          },
        ],
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

    const tool = getFileTool(mockClient, 'appName', 'fieldName', 1, 'fileName');

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Unable to get file: Fields fieldname not found',
        },
      ],
    });
  });

  test('it should return an error message when target field is not an attachment field', async () => {
    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [
          {
            id: 1,
            name: 'appName',
          },
        ],
        totalPages: 1,
      },
    });

    const testFields = [
      new Field(1, 1, 'fieldName', FieldType.Text, FieldStatus.Enabled, false, false),
    ];

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: testFields,
        totalPages: 1,
      },
    });

    const tool = getFileTool(mockClient, 'appName', 'fieldName', 1, 'fileName');

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Unable to get file: Field fieldName is not an attachment field',
        },
      ],
    });
  });

  test('it should return an error message when unable to find record', async () => {
    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [
          {
            id: 1,
            name: 'appName',
          },
        ],
        totalPages: 1,
      },
    });

    const testFields = [
      new Field(1, 1, 'fieldName', FieldType.Attachment, FieldStatus.Enabled, false, false),
    ];

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: testFields,
        totalPages: 1,
      },
    });

    mockClient.getRecordById = vi.fn().mockResolvedValue({
      isSuccessful: false,
      message: 'Oh no!',
      statusCode: 400,
    });

    const tool = getFileTool(mockClient, 'appName', 'fieldName', 1, 'fileName');

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Unable to get file: Oh no! (400)',
        },
      ],
    });
  });

  test('it should return an error message when record is null', async () => {
    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [
          {
            id: 1,
            name: 'appName',
          },
        ],
        totalPages: 1,
      },
    });

    const testFields = [
      new Field(1, 1, 'fieldName', FieldType.Attachment, FieldStatus.Enabled, false, false),
    ];

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: testFields,
        totalPages: 1,
      },
    });

    mockClient.getRecordById = vi.fn().mockResolvedValue({
      isSuccessful: true,
      message: 'Oh no!',
      statusCode: 200,
      data: null,
    });

    const tool = getFileTool(mockClient, 'appName', 'fieldName', 1, 'fileName');

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Unable to get file: Oh no! (200)',
        },
      ],
    });
  });

  test('it should return an error message when no field value is present on the record', async () => {
    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [
          {
            id: 1,
            name: 'appName',
          },
        ],
        totalPages: 1,
      },
    });

    const testFields = [
      new Field(1, 1, 'fieldName', FieldType.Attachment, FieldStatus.Enabled, false, false),
    ];

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: testFields,
        totalPages: 1,
      },
    });

    mockClient.getRecordById = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        recordId: 1,
        fieldData: [],
      },
    });

    const tool = getFileTool(mockClient, 'appName', 'fieldName', 1, 'fileName');

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Unable to get file: Field fieldName not found in record 1',
        },
      ],
    });
  });

  test('it should return an error message when unable to find file with the given name', async () => {
    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [
          {
            id: 1,
            name: 'appName',
          },
        ],
        totalPages: 1,
      },
    });

    const testFields = [
      new Field(1, 1, 'fieldName', FieldType.Attachment, FieldStatus.Enabled, false, false),
    ];

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: testFields,
        totalPages: 1,
      },
    });

    mockClient.getRecordById = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        recordId: 1,
        fieldData: [new AttachmentListRecordValue(1, [])],
      },
    });

    const tool = getFileTool(mockClient, 'appName', 'fieldName', 1, 'fileName');

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Unable to get file: File fileName not found in field fieldName',
        },
      ],
    });
  });

  test('it should return an error message when file is found, but is not stored internally', async () => {
    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [
          {
            id: 1,
            name: 'appName',
          },
        ],
        totalPages: 1,
      },
    });

    const testFields = [
      new Field(1, 1, 'fieldName', FieldType.Attachment, FieldStatus.Enabled, false, false),
    ];

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: testFields,
        totalPages: 1,
      },
    });

    mockClient.getRecordById = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        recordId: 1,
        fieldData: [
          new AttachmentListRecordValue(1, [
            new Attachment(1, 'fileName', 'notes', FileStorageSite.GoogleDrive),
          ]),
        ],
      },
    });

    const tool = getFileTool(mockClient, 'appName', 'fieldName', 1, 'fileName');

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Unable to get file: File fileName is not stored in Onspring. It is stored in GoogleDrive',
        },
      ],
    });
  });

  test('it should return an error message when unable to get file', async () => {
    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [
          {
            id: 1,
            name: 'appName',
          },
        ],
        totalPages: 1,
      },
    });

    const testFields = [
      new Field(1, 1, 'fieldName', FieldType.Attachment, FieldStatus.Enabled, false, false),
    ];

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: testFields,
        totalPages: 1,
      },
    });

    mockClient.getRecordById = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        recordId: 1,
        fieldData: [
          new AttachmentListRecordValue(1, [
            new Attachment(1, 'fileName', 'notes', FileStorageSite.Internal),
          ]),
        ],
      },
    });

    mockClient.getFileById = vi.fn().mockResolvedValue({
      isSuccessful: false,
      message: 'Oh no!',
      statusCode: 404,
    });

    const tool = getFileTool(mockClient, 'appName', 'fieldName', 1, 'fileName');

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Unable to get file: Oh no! (404)',
        },
      ],
    });
  });

  test('it should return an error message when file is null', async () => {
    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [
          {
            id: 1,
            name: 'appName',
          },
        ],
        totalPages: 1,
      },
    });

    const testFields = [
      new Field(1, 1, 'fieldName', FieldType.Attachment, FieldStatus.Enabled, false, false),
    ];

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: testFields,
        totalPages: 1,
      },
    });

    mockClient.getRecordById = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        recordId: 1,
        fieldData: [
          new AttachmentListRecordValue(1, [
            new Attachment(1, 'fileName', 'notes', FileStorageSite.Internal),
          ]),
        ],
      },
    });

    mockClient.getFileById = vi.fn().mockResolvedValue({
      isSuccessful: true,
      message: 'Oh no!',
      statusCode: 200,
      data: null,
    });

    const tool = getFileTool(mockClient, 'appName', 'fieldName', 1, 'fileName');

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Unable to get file: Oh no! (200)',
        },
      ],
    });
  });

  test('it should return the file name and a resource that is a utf8 string when file is found and file is text', async () => {
    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [
          {
            id: 1,
            name: 'appName',
          },
        ],
        totalPages: 1,
      },
    });

    const testFields = [
      new Field(1, 1, 'fieldName', FieldType.Attachment, FieldStatus.Enabled, false, false),
    ];

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: testFields,
        totalPages: 1,
      },
    });

    mockClient.getRecordById = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        recordId: 1,
        fieldData: [
          new AttachmentListRecordValue(1, [
            new Attachment(1, 'fileName', 'notes', FileStorageSite.Internal),
          ]),
        ],
      },
    });

    mockClient.getFileById = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: new File(Readable.from('Hello World'), 'fileName', 'text/plain', 11),
    });

    const tool = getFileTool(mockClient, 'appName', 'fieldName', 1, 'fileName');

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'File fileName retrieved successfully',
        },
        {
          type: 'resource',
          resource: {
            blob: 'Hello World',
            mimeType: 'text/plain',
            uri: '',
          },
        },
      ],
    });
  });

  test('it should return the file name and a resource that is a base64 string when file is found and file is not text', async () => {
    mockClient.getApps = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: [
          {
            id: 1,
            name: 'appName',
          },
        ],
        totalPages: 1,
      },
    });

    const testFields = [
      new Field(1, 1, 'fieldName', FieldType.Attachment, FieldStatus.Enabled, false, false),
    ];

    mockClient.getFieldsByAppId = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        items: testFields,
        totalPages: 1,
      },
    });

    mockClient.getRecordById = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: {
        recordId: 1,
        fieldData: [
          new AttachmentListRecordValue(1, [
            new Attachment(1, 'fileName', 'notes', FileStorageSite.Internal),
          ]),
        ],
      },
    });

    mockClient.getFileById = vi.fn().mockResolvedValue({
      isSuccessful: true,
      statusCode: 200,
      data: new File(Readable.from('Hello World'), 'fileName', 'image/png', 11),
    });

    const tool = getFileTool(mockClient, 'appName', 'fieldName', 1, 'fileName');

    const result = await tool(handlerExtras);

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'File fileName retrieved successfully',
        },
        {
          type: 'resource',
          resource: {
            blob: Buffer.from('Hello World').toString('base64'),
            mimeType: 'image/png',
            uri: '',
          },
        },
      ],
    });
  });
});
