import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  DataFormat,
  FormulaField,
  ListField,
  OnspringClient,
  Record,
  ReportDataType,
} from "onspring-api-sdk";
import { getApps, getFields, getRecords, getReports, queryRecords } from "./utils.js";
import { convertFilterToString, Filter } from "./filter.js";

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
      // TODO: Do I care if fields are not found? IDK
      // TODO: Do I care if no fields are found? IDK
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
      const requestedFields = await getFieldsByName(client, appId, fields);
      const requestedFieldIds = parseKeysToInts(requestedFields);

      const response: GetRecordsResponse = {
        appId: appId,
        records: [],
        totalPages: 0,
      };

      const filterString = convertFilterToString(filter);

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
  const normalizedFields = fields.map((field) => field.toLowerCase());
  const foundFields: { [index: number]: string } = {};

  for await (const field of getFields(client, appId)) {
    if (normalizedFields.includes(field.name.toLowerCase())) {
      foundFields[field.id] = field.name;
    }
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
  requestedFields: { [index: number]: string },
) {
  if (record.recordId === null) {
    throw new Error("Record ID is null");
  }

  const onxRecord: OnxRecord = {
    recordId: record.recordId,
    data: {},
  };

  for (const fieldValue of record.fieldData) {
    const fieldName = requestedFields[fieldValue.fieldId];
    onxRecord.data[fieldName] = fieldValue.value;
  }

  return onxRecord;
}

function parseKeysToInts(fields: { [index: number]: string }) {
  return Object.keys(fields).map((key) => parseInt(key, 10));
}
