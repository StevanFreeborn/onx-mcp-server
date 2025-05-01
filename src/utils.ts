import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import {
  DataFormat,
  Field,
  GetRecordsByAppIdRequest,
  OnspringClient,
  PagingRequest,
  QueryRecordsRequest,
  Record,
} from 'onspring-api-sdk';

export type OnxRecord = {
  recordId: number;
  data: {
    [key: string]: string | null;
  };
};

export type GetRecordsResponse = {
  appId: number;
  records: OnxRecord[];
  totalPages: number;
  totalRecords: number;
};

export function createOnspringClient() {
  const baseUrl = process.env.ONSPRING_BASE_URL;
  const apiKey = process.env.ONSPRING_API_KEY;

  if (!baseUrl) {
    throw new Error('Unable to create Onspring client because ONSPRING_BASE_URL is not set');
  }

  if (!apiKey) {
    throw new Error('Unable to create Onspring client because ONSPRING_API_KEY is not set');
  }

  return new OnspringClient(baseUrl, apiKey);
}

export async function* getApps(client: OnspringClient) {
  const pagingRequest = new PagingRequest(1, 100);
  let totalPages = 1;

  do {
    const appsResponse = await client.getApps(pagingRequest);

    if (appsResponse.isSuccessful === false || appsResponse.data === null) {
      throw new Error(`${appsResponse.message} (${appsResponse.statusCode})`);
    }

    yield* appsResponse.data.items;
    pagingRequest.pageNumber++;
    totalPages = appsResponse.data.totalPages;
  } while (pagingRequest.pageNumber <= totalPages);
}

export async function* getFields(client: OnspringClient, appId: number) {
  const pagingRequest = new PagingRequest(1, 100);
  let totalPages = 1;

  do {
    const fieldsResponse = await client.getFieldsByAppId(appId, pagingRequest);

    if (fieldsResponse.isSuccessful === false || fieldsResponse.data === null) {
      throw new Error(`${fieldsResponse.message} (${fieldsResponse.statusCode})`);
    }

    yield* fieldsResponse.data.items;
    pagingRequest.pageNumber++;
    totalPages = fieldsResponse.data.totalPages;
  } while (pagingRequest.pageNumber <= totalPages);
}

export async function* getRecords(
  client: OnspringClient,
  appId: number,
  fieldIds: number[],
  pageNumber: number,
  numberOfPages: number,
) {
  const recordsPagingRequest = new PagingRequest(pageNumber, 100);
  let totalRecordPages = 0;

  do {
    const request = new GetRecordsByAppIdRequest(
      appId,
      fieldIds,
      DataFormat.Formatted,
      recordsPagingRequest,
    );

    const recordsResponse = await client.getRecordsByAppId(request);

    if (recordsResponse.isSuccessful === false || recordsResponse.data === null) {
      throw new Error(
        `Unable to get records for app ${appId} with fields ${fieldIds.join(', ')}: ${recordsResponse.message} (${recordsResponse.statusCode})`,
      );
    }

    totalRecordPages = recordsResponse.data.totalPages;
    yield {
      records: recordsResponse.data.items,
      totalPages: totalRecordPages,
      totalRecords: recordsResponse.data.totalRecords,
    };
    recordsPagingRequest.pageNumber++;
  } while (recordsPagingRequest.pageNumber <= numberOfPages);
}

export async function* getReports(client: OnspringClient, appId: number) {
  const pagingRequest = new PagingRequest(1, 100);
  let totalPages = 1;

  do {
    const reportsResponse = await client.getReportsByAppId(appId, pagingRequest);

    if (reportsResponse.isSuccessful === false || reportsResponse.data === null) {
      throw new Error(`${reportsResponse.message} (${reportsResponse.statusCode})`);
    }

    yield* reportsResponse.data.items;
    pagingRequest.pageNumber++;
    totalPages = reportsResponse.data.totalPages;
  } while (pagingRequest.pageNumber <= totalPages);
}

export async function* queryRecords(
  client: OnspringClient,
  appId: number,
  fieldIds: number[],
  filter: string,
  pageNumber: number,
  numberOfPages: number,
) {
  const recordsPagingRequest = new PagingRequest(pageNumber, 100);
  let totalRecordPages = 0;

  do {
    const request = new QueryRecordsRequest(
      appId,
      filter,
      fieldIds,
      DataFormat.Formatted,
      recordsPagingRequest,
    );

    const recordsResponse = await client.queryRecords(request);

    if (recordsResponse.isSuccessful === false || recordsResponse.data === null) {
      throw new Error(
        `Unable to get records for app ${appId} with fields ${fieldIds.join(', ')}: ${recordsResponse.message} (${recordsResponse.statusCode})`,
      );
    }

    totalRecordPages = recordsResponse.data.totalPages;
    yield {
      records: recordsResponse.data.items,
      totalPages: totalRecordPages,
      totalRecords: recordsResponse.data.totalRecords,
    };
    recordsPagingRequest.pageNumber++;
  } while (recordsPagingRequest.pageNumber <= numberOfPages);
}

export async function getAppId(client: OnspringClient, appName: string) {
  for await (const app of getApps(client)) {
    if (app.name.toLowerCase() === appName.toLowerCase()) {
      return app.id;
    }
  }

  throw new Error(`App ${appName} not found`);
}

export async function getFieldsByName(client: OnspringClient, appId: number, fields: string[]) {
  const fieldsToFind = fields.map(field => field.toLowerCase());
  const foundFields: { [index: number]: Field } = {};

  for await (const field of getFields(client, appId)) {
    for (const [index, fieldName] of fieldsToFind.entries()) {
      if (field.name.toLowerCase() === fieldName) {
        foundFields[field.id] = field;
        fieldsToFind.splice(index, 1);
        break;
      }
    }
  }

  if (fieldsToFind.length > 0) {
    throw new Error(`Fields ${fieldsToFind.join(', ')} not found`);
  }

  if (Object.keys(foundFields).length === 0) {
    throw new Error('No fields found');
  }

  return foundFields;
}

export async function getReportId(client: OnspringClient, appId: number, reportName: string) {
  for await (const report of getReports(client, appId)) {
    if (report.name.toLowerCase() === reportName.toLowerCase()) {
      return report.id;
    }
  }

  throw new Error(`Report ${reportName} not found`);
}

export function buildOnxRecord(record: Record, requestedFields: { [index: number]: Field }) {
  if (record.recordId === null) {
    throw new Error('Record ID is null');
  }

  const onxRecord: OnxRecord = {
    recordId: record.recordId,
    data: {},
  };

  for (const fieldValue of record.fieldData) {
    const field = requestedFields[fieldValue.fieldId];

    if (field === undefined) {
      continue;
    }

    onxRecord.data[field.name] = fieldValue.value;
  }

  return onxRecord;
}

export function parseKeysToInts(fields: { [index: number]: Field }) {
  return Object.keys(fields).map(key => parseInt(key, 10));
}

export function handleError(msg: string, error: unknown): CallToolResult {
  console.error(msg, error);

  let errorMessage = msg;

  if (error instanceof Error && error.message) {
    errorMessage = errorMessage + ': ' + error.message;
  }

  return {
    isError: true,
    content: [{ type: 'text', text: errorMessage }],
  };
}

export function filterFieldsByName(fields: { [index: number]: Field }, fieldNames: string[]) {
  return Object.entries(fields).reduce(
    (acc, [key, field]) => {
      if (fieldNames.includes(field.name)) {
        acc[parseInt(key, 10)] = field;
      }
      return acc;
    },
    {} as { [index: number]: Field },
  );
}
