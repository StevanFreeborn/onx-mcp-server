import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  DataFormat,
  FormulaField,
  GetRecordsByAppIdRequest,
  ListField,
  OnspringClient,
  PagingRequest,
  Record,
} from "onspring-api-sdk";
import { getApps, getFields, getRecords } from "./utils.js";

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
    [key: string]: string | number | boolean | null;
  };
};

type GetRecordsToolResponse = {
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
      const requestedFieldIds = Object.keys(requestedFields).map((key) =>
        parseInt(key, 10),
      );
      const response: GetRecordsToolResponse = {
        appId: appId,
        records: [],
        totalPages: 0,
      };
      
      // TODO: Need to return the total number of pages
      for await (const record of getRecords(
        client,
        appId,
        requestedFieldIds,
        pageNumber,
        numberOfPages,
      )) {
        const onxRecords: OnxRecord[] = [];

        if (record.recordId === null) {
          continue;
        }

        const onxRecord: OnxRecord = {
          recordId: record.recordId,
          data: {},
        };

        for (const fieldValue of record.fieldData) {
          const fieldName = requestedFields[fieldValue.fieldId];
          onxRecord.data[fieldName] = fieldValue.value;
        }

        onxRecords.push(onxRecord);

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
