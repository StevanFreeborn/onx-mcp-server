import { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';

import {
  DataFormat,
  Field,
  FieldType,
  FileStorageSite,
  FormulaField,
  GetRecordRequest,
  ListField,
  OnspringClient,
  ReportDataType,
} from 'onspring-api-sdk';

import {
  buildOnxRecord,
  filterFieldsByName,
  getAppId,
  getApps,
  getFields,
  getFieldsByName,
  getRecords,
  GetRecordsResponse,
  getReportId,
  getReports,
  handleError,
  OnxRecord,
  parseKeysToInts,
  queryRecords,
} from './utils.js';

import { convertFilterToString, Filter, getFieldNamesFromFilter } from './filter.js';

export function checkConnectionTool(client: OnspringClient): ToolCallback {
  if (!client) {
    throw new Error('Unable to create checkConnectionTool because client is not set');
  }

  return async () => {
    try {
      const canConnect = await client.canConnect();

      return {
        content: [{ type: 'text', text: canConnect ? 'Connected' : 'Not connected' }],
      };
    } catch (error) {
      return handleError('Unable to check connection', error);
    }
  };
}

export function getAppsTool(client: OnspringClient): ToolCallback {
  if (!client) {
    throw new Error('Unable to create getAppsTool because client is not set');
  }

  return async () => {
    try {
      const apps: string[] = [];

      for await (const app of getApps(client)) {
        apps.push(app.name);
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(apps) }],
      };
    } catch (error) {
      return handleError('Unable to get apps', error);
    }
  };
}

export function getFieldsTool(client: OnspringClient, name: string): ToolCallback {
  if (!client) {
    throw new Error('Unable to create getFieldsTool because client is not set');
  }

  return async () => {
    try {
      const appId = await getAppId(client, name);
      const fields: { name: string; type: string; id: number }[] = [];

      for await (const field of getFields(client, appId)) {
        if (field instanceof ListField) {
          fields.push({
            id: field.id,
            name: field.name,
            type: `${field.multiplicity} ${field.type}`,
          });
          continue;
        }

        if (field instanceof FormulaField) {
          fields.push({
            id: field.id,
            name: field.name,
            type: `${field.outputType} ${field.type}`,
          });
          continue;
        }

        fields.push({
          id: field.id,
          name: field.name,
          type: field.type,
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(fields),
          },
        ],
      };
    } catch (error) {
      return handleError('Unable to get fields', error);
    }
  };
}

export function getRecordsTool(
  client: OnspringClient,
  appName: string,
  fields: string[],
  pageNumber: number,
  numberOfPages: number,
): ToolCallback {
  if (!client) {
    throw new Error('Unable to create getRecordsTool because client is not set');
  }

  return async () => {
    try {
      const appId = await getAppId(client, appName);
      const requestedFields = await getFieldsByName(client, appId, fields);
      const requestedFieldIds = parseKeysToInts(requestedFields);
      const response: GetRecordsResponse = {
        appId: appId,
        records: [],
        totalPages: 0,
        totalRecords: 0,
      };

      const pages = getRecords(client, appId, requestedFieldIds, pageNumber, numberOfPages);

      for await (const page of pages) {
        for (const record of page.records) {
          const onxRecord = buildOnxRecord(record, requestedFields);
          response.records.push(onxRecord);
          response.totalPages = page.totalPages;
          response.totalRecords = page.totalRecords;
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response),
          },
        ],
      };
    } catch (error) {
      return handleError('Unable to get records', error);
    }
  };
}

export function getReportsTool(client: OnspringClient, appName: string): ToolCallback {
  if (!client) {
    throw new Error('Unable to create getReportsTool because client is not set');
  }

  return async () => {
    try {
      const appId = await getAppId(client, appName);
      const reports: string[] = [];

      for await (const report of getReports(client, appId)) {
        reports.push(report.name);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(reports),
          },
        ],
      };
    } catch (error) {
      return handleError('Unable to get reports', error);
    }
  };
}

export function getReportDataTool(
  client: OnspringClient,
  appName: string,
  reportName: string,
  dataType: ReportDataType = ReportDataType.ReportData,
): ToolCallback {
  if (!client) {
    throw new Error('Unable to create getReportDataTool because client is not set');
  }

  return async () => {
    try {
      const appId = await getAppId(client, appName);
      const reportId = await getReportId(client, appId, reportName);
      const response = await client.getReportById(reportId, DataFormat.Formatted, dataType);

      if (response.isSuccessful === false || response.data === null) {
        throw new Error(`${response.message} (${response.statusCode})`);
      }

      const reportData: OnxRecord[] = [];

      for (const row of response.data.rows) {
        const onxRecord: OnxRecord = {
          recordId: row.recordId,
          data: {},
        };

        for (const [index, column] of response.data.columns.entries()) {
          onxRecord.data[column] = row.cells[index];
        }

        reportData.push(onxRecord);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(reportData),
          },
        ],
      };
    } catch (error) {
      return handleError('Unable to get report data', error);
    }
  };
}

export function queryRecordsTool(
  client: OnspringClient,
  appName: string,
  fields: string[],
  filter: Filter,
  pageNumber: number,
  numberOfPages: number,
): ToolCallback {
  if (!client) {
    throw new Error('Unable to create queryRecordsTool because client is not set');
  }

  return async () => {
    try {
      const appId = await getAppId(client, appName);
      const filterFields = getFieldNamesFromFilter(filter);
      const fieldsToLookUp = Array.from(new Set([...fields, ...filterFields]));
      const fieldsNeeded = await getFieldsByName(client, appId, fieldsToLookUp);

      const fieldsNeededForFilter = filterFieldsByName(fieldsNeeded, Array.from(filterFields));

      const fieldsNeededForQuery = filterFieldsByName(fieldsNeeded, fields);

      const requestedFieldIds = parseKeysToInts(fieldsNeededForQuery);

      const response: GetRecordsResponse = {
        appId: appId,
        records: [],
        totalPages: 0,
        totalRecords: 0,
      };

      const filterString = convertFilterToString(filter, fieldsNeededForFilter);

      const pages = queryRecords(
        client,
        appId,
        requestedFieldIds,
        filterString,
        pageNumber,
        numberOfPages,
      );

      for await (const page of pages) {
        for (const record of page.records) {
          const onxRecord = buildOnxRecord(record, fieldsNeededForQuery);
          response.records.push(onxRecord);
          response.totalPages = page.totalPages;
          response.totalRecords = page.totalRecords;
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response),
          },
        ],
      };
    } catch (error) {
      return handleError('Unable to get records', error);
    }
  };
}

export function getFileTool(
  client: OnspringClient,
  appName: string,
  fieldName: string,
  recordId: number,
  fileName: string,
): ToolCallback {
  if (!client) {
    throw new Error('Unable to create getFileTool because client is not set');
  }

  return async () => {
    try {
      const appId = await getAppId(client, appName);
      const requestedFields = await getFieldsByName(client, appId, [fieldName]);
      let targetField: Field | null = null;

      for (const field of Object.values(requestedFields)) {
        if (field.name.toLowerCase() === fieldName.toLowerCase()) {
          targetField = field;
          break;
        }
      }

      if (targetField === null) {
        throw new Error(`Field ${fieldName} not found`);
      }

      if (targetField.type !== FieldType.Attachment) {
        throw new Error(`Field ${fieldName} is not an attachment field`);
      }

      const getRecordRequest = new GetRecordRequest(
        appId,
        recordId,
        [targetField.id],
        DataFormat.Formatted,
      );

      const recordResponse = await client.getRecordById(getRecordRequest);

      if (recordResponse.isSuccessful === false || recordResponse.data === null) {
        throw new Error(`${recordResponse.message} (${recordResponse.statusCode})`);
      }

      const fieldValue = recordResponse.data.fieldData.find(
        field => field.fieldId === targetField.id,
      );

      if (fieldValue === undefined) {
        throw new Error(`Field ${fieldName} not found in record ${recordId}`);
      }

      let fileId: number | null = null;

      switch (targetField.type) {
        case FieldType.Attachment: {
          const attachmentFieldValue = fieldValue.asAttachmentArray();

          for (const file of attachmentFieldValue.values()) {
            if (file.fileName.toLowerCase() === fileName.toLowerCase()) {
              if (file.storageLocation !== FileStorageSite.Internal) {
                throw new Error(
                  `File ${fileName} is not stored in Onspring. It is stored in ${file.storageLocation}`,
                );
              }

              fileId = file.fileId;
              break;
            }
          }
          break;
        }
        default:
          throw new Error(`Field ${fieldName} is not an attachment or image field`);
      }

      if (fileId === null) {
        throw new Error(`File ${fileName} not found in field ${fieldName}`);
      }

      const fileResponse = await client.getFileById(recordId, targetField.id, fileId);

      if (fileResponse.isSuccessful === false || fileResponse.data === null) {
        throw new Error(`${fileResponse.message} (${fileResponse.statusCode})`);
      }

      const chunks: Buffer[] = [];

      for await (const chunk of fileResponse.data.stream) {
        const isBuffer = Buffer.isBuffer(chunk);

        if (isBuffer) {
          chunks.push(chunk);
          continue;
        }

        chunks.push(Buffer.from(chunk));
      }

      const fileBuffer = Buffer.concat(chunks);

      if (fileResponse.data.contentType.startsWith('text/')) {
        return {
          content: [
            {
              type: 'text',
              text: `File ${fileName} retrieved successfully`,
            },
            {
              type: 'resource',
              resource: {
                blob: fileBuffer.toString('utf-8'),
                mimeType: fileResponse.data.contentType,
                uri: '',
              },
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `File ${fileName} retrieved successfully`,
          },
          {
            type: 'resource',
            resource: {
              blob: fileBuffer.toString('base64'),
              mimeType: fileResponse.data.contentType,
              uri: '',
            },
          },
        ],
      };
    } catch (error) {
      return handleError('Unable to get file', error);
    }
  };
}
