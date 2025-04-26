import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  DataFormat,
  Field,
  FieldType,
  FormulaField,
  GetRecordRequest,
  ListField,
  OnspringClient,
  Record,
  ReportDataType,
} from "onspring-api-sdk";

import {
  getApps,
  getFields,
  getRecords,
  getReports,
  queryRecords,
} from "./utils.js";

import {
  convertFilterToString,
  Filter,
  getFieldNamesFromFilter,
} from "./filter.js";

export function checkConnectionTool(client: OnspringClient): ToolCallback {
  if (!client) {
    throw new Error(
      "Unable to create checkConnectionTool because client is not set",
    );
  }

  return async () => {
    try {
      const canConnect = await client.canConnect();

      return {
        content: [
          { type: "text", text: canConnect ? "Connected" : "Not connected" },
        ],
      };
    } catch (error) {
      console.error(error);

      let errorMessage = "Unable to connect to Onspring";

      if (error instanceof Error && error.message) {
        errorMessage = errorMessage + ": " + error.message;
      }

      return {
        isError: true,
        content: [{ type: "text", text: errorMessage }],
      };
    }
  };
}

export function getAppsTool(client: OnspringClient): ToolCallback {
  if (!client) {
    throw new Error("Unable to create getAppsTool because client is not set");
  }

  return async () => {
    try {
      const apps: string[] = [];

      for await (const app of getApps(client)) {
        apps.push(app.name);
      }

      return {
        content: [{ type: "text", text: JSON.stringify(apps) }],
      };
    } catch (error) {
      console.error(error);

      let errorMessage = "Unable to get apps";

      if (error instanceof Error && error.message) {
        errorMessage = errorMessage + ": " + error.message;
      }

      return {
        isError: true,
        content: [{ type: "text", text: errorMessage }],
      };
    }
  };
}

export function getFieldsTool(
  client: OnspringClient,
  name: string,
): ToolCallback {
  if (!client) {
    throw new Error("Unable to create getFieldsTool because client is not set");
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
            type: "text",
            text: JSON.stringify(fields),
          },
        ],
      };
    } catch (error) {
      console.error(error);

      let errorMessage = "Unable to get fields";

      if (error instanceof Error && error.message) {
        errorMessage = errorMessage + ": " + error.message;
      }

      return {
        isError: true,
        content: [{ type: "text", text: errorMessage }],
      };
    }
  };
}

type OnxRecord = {
  recordId: number;
  data: {
    [key: string]: string | null;
  };
};

type GetRecordsResponse = {
  appId: number;
  records: OnxRecord[];
  totalPages: number;
};

export function getRecordsTool(
  client: OnspringClient,
  appName: string,
  fields: string[],
  pageNumber: number,
  numberOfPages: number,
): ToolCallback {
  if (!client) {
    throw new Error(
      "Unable to create getRecordsTool because client is not set",
    );
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
      };

      const pages = getRecords(
        client,
        appId,
        requestedFieldIds,
        pageNumber,
        numberOfPages,
      );

      for await (const page of pages) {
        const onxRecords: OnxRecord[] = [];

        for (const record of page.records) {
          const onxRecord = buildOnxRecord(record, requestedFields);
          onxRecords.push(onxRecord);
          response.totalPages = page.totalPages;
        }

        response.records.push(...onxRecords);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response),
          },
        ],
      };
    } catch (error) {
      console.error(error);

      let errorMessage = "Unable to get records";

      if (error instanceof Error && error.message) {
        errorMessage = errorMessage + ": " + error.message;
      }

      return {
        isError: true,
        content: [{ type: "text", text: errorMessage }],
      };
    }
  };
}

export function getReportsTool(
  client: OnspringClient,
  appName: string,
): ToolCallback {
  if (!client) {
    throw new Error(
      "Unable to create getReportsTool because client is not set",
    );
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
            type: "text",
            text: JSON.stringify(reports),
          },
        ],
      };
    } catch (error) {
      console.error(error);

      console.error(error);

      let errorMessage = "Unable to get reports";

      if (error instanceof Error && error.message) {
        errorMessage = errorMessage + ": " + error.message;
      }

      return {
        isError: true,
        content: [{ type: "text", text: errorMessage }],
      };
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
    throw new Error(
      "Unable to create getReportDataTool because client is not set",
    );
  }

  return async () => {
    try {
      const appId = await getAppId(client, appName);
      const reportId = await getReportId(client, appId, reportName);
      const response = await client.getReportById(
        reportId,
        DataFormat.Formatted,
        dataType,
      );

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
            type: "text",
            text: JSON.stringify(reportData),
          },
        ],
      };
    } catch (error) {
      console.error(error);

      let errorMessage = "Unable to get report data";

      if (error instanceof Error && error.message) {
        errorMessage = errorMessage + ": " + error.message;
      }

      return {
        isError: true,
        content: [{ type: "text", text: errorMessage }],
      };
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
    throw new Error(
      "Unable to create queryRecordsTool because client is not set",
    );
  }

  return async () => {
    try {
      const appId = await getAppId(client, appName);
      const filterFields = getFieldNamesFromFilter(filter);
      const fieldsToLookUp = [...fields, ...Array.from(filterFields)];
      const requestedFields = await getFieldsByName(
        client,
        appId,
        fieldsToLookUp,
      );
      const requestedFieldIds = parseKeysToInts(requestedFields);

      const response: GetRecordsResponse = {
        appId: appId,
        records: [],
        totalPages: 0,
      };

      const filterString = convertFilterToString(filter, requestedFields);

      const pages = queryRecords(
        client,
        appId,
        requestedFieldIds,
        filterString,
        pageNumber,
        numberOfPages,
      );

      for await (const page of pages) {
        const onxRecords: OnxRecord[] = [];

        for (const record of page.records) {
          const onxRecord = buildOnxRecord(record, requestedFields);
          onxRecords.push(onxRecord);
          response.totalPages = page.totalPages;
        }

        response.records.push(...onxRecords);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response),
          },
        ],
      };
    } catch (error) {
      console.error(error);

      let errorMessage = "Unable to get records";

      if (error instanceof Error && error.message) {
        errorMessage = errorMessage + ": " + error.message;
      }

      return {
        isError: true,
        content: [{ type: "text", text: errorMessage }],
      };
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
    throw new Error("Unable to create getFileTool because client is not set");
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
      
      console.error("targetField", targetField);

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
        (field) => field.fieldId === targetField.id,
      );

      if (fieldValue === undefined) {
        throw new Error(`Field ${fieldName} not found in record ${recordId}`);
      }

      let fileId: number | null = null;

      switch (targetField.type) {
        case FieldType.Attachment:
          const attachmentFieldValue = fieldValue.asAttachmentArray();
          console.error("attachmentFieldValue", attachmentFieldValue);
          for (const file of attachmentFieldValue.values()) {
            if (file.fileName.toLowerCase() === fileName.toLowerCase()) {
              fileId = file.fileId;
              break;
            }
          }
          break;
        default:
          throw new Error(`Field ${fieldName} is not an attachment or image field`);
      }

      if (fileId === null) {
        throw new Error(`File ${fileName} not found in field ${fieldName}`);
      }

      const fileResponse = await client.getFileById(
        recordId,
        targetField.id,
        fileId,
      );

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
      
      // TODO: What mime types are text vs non-text?

      // TODO: Need to check file's content type
      // if file content type is text then convert
      // to utf8 string and return as text
      // otherwise return as base64 encoded string

      return {
        content: [
          {
            type: "text",
            text: `File ${fileName} retrieved successfully`,
          },
          {
            type: "resource",
            resource: {
              blob: fileBuffer.toString("base64"),
              mimeType: fileResponse.data.contentType,
              uri: '',
            }
          },
        ],
      };
    } catch (error) {
      console.error(error);

      let errorMessage = "Unable to get file";

      if (error instanceof Error && error.message) {
        errorMessage = errorMessage + ": " + error.message;
      }

      return {
        isError: true,
        content: [{ type: "text", text: errorMessage }],
      };
    }
  };
}

async function getAppId(client: OnspringClient, appName: string) {
  for await (const app of getApps(client)) {
    if (app.name.toLowerCase() === appName.toLowerCase()) {
      return app.id;
    }
  }

  throw new Error(`App ${appName} not found`);
}

async function getFieldsByName(
  client: OnspringClient,
  appId: number,
  fields: string[],
) {
  const fieldsToFind = fields.map((field) => field.toLowerCase());
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
    throw new Error(`Fields ${fieldsToFind.join(", ")} not found`);
  }

  if (Object.keys(foundFields).length === 0) {
    throw new Error("No fields found");
  }

  return foundFields;
}

async function getReportId(
  client: OnspringClient,
  appId: number,
  reportName: string,
) {
  for await (const report of getReports(client, appId)) {
    console.error("report", report);
    if (report.name.toLowerCase() === reportName.toLowerCase()) {
      return report.id;
    }
  }

  throw new Error(`Report ${reportName} not found`);
}

function buildOnxRecord(
  record: Record,
  requestedFields: { [index: number]: Field },
) {
  if (record.recordId === null) {
    throw new Error("Record ID is null");
  }

  const onxRecord: OnxRecord = {
    recordId: record.recordId,
    data: {},
  };

  for (const fieldValue of record.fieldData) {
    const field = requestedFields[fieldValue.fieldId];
    onxRecord.data[field.name] = fieldValue.value;
  }

  return onxRecord;
}

function parseKeysToInts(fields: { [index: number]: Field }) {
  return Object.keys(fields).map((key) => parseInt(key, 10));
}
