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
import { getApps, getFields } from "./utils.js";

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

export function getRecordsTool(
  client: OnspringClient,
  appName: string,
  fields: string[],
): ToolCallback {
  if (!client) {
    throw new Error(
      "Unable to create getRecordsTool because client is not set",
    );
  }

  return async () => {
    const appId = await getAppId(client, appName);

    // TODO: Do I care if fields are not found? IDK
    // TODO: Do I care if no fields are found? IDK
    const fieldIds = await getFieldIds(client, appId, fields);

    const records: Record[] = [];
    const recordsPagingRequest = new PagingRequest(1, 100);
    let totalRecordPages = 0;

    do {
      const request = new GetRecordsByAppIdRequest(
        appId,
        fieldIds,
        DataFormat.Formatted,
        recordsPagingRequest,
      );

      const recordsResponse = await client.getRecordsByAppId(request);

      if (
        recordsResponse.isSuccessful === false ||
        recordsResponse.data === null
      ) {
        throw new Error(
          `Unable to get records for app ${appName} with fields ${fields}`,
        );
      }

      records.push(...recordsResponse.data.items);
      totalRecordPages = recordsResponse.data.totalPages;
      recordsPagingRequest.pageNumber++;
    } while (recordsPagingRequest.pageNumber <= totalRecordPages);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(records),
        },
      ],
    };
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

async function getFieldIds(
  client: OnspringClient,
  appId: number,
  fields: string[],
) {
  const normalizedFields = fields.map((field) => field.toLowerCase());
  const fieldIds: number[] = [];

  for await (const field of getFields(client, appId)) {
    if (normalizedFields.includes(field.name.toLowerCase())) {
      fieldIds.push(field.id);
    }
  }

  return fieldIds;
}
