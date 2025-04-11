import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { App, OnspringClient, PagingRequest } from "onspring-api-sdk";
import { z, ZodRawShape } from "zod";

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
      let appId: number | undefined;

      for await (const app of getApps(client)) {
        if (app.name.toLowerCase() === name.toLowerCase()) {
          appId = app.id;
          break;
        }
      }

      if (!appId) {
        return {
          isError: true,
          content: [{ type: "text", text: `App ${name} not found` }],
        };
      }

      const fields: string[] = [];

      for await (const field of getFields(client, appId)) {
        fields.push(field.name);
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

async function* getApps(client: OnspringClient) {
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

async function* getFields(client: OnspringClient, appId: number) {
  const pagingRequest = new PagingRequest(1, 100);
  let totalPages = 1;

  do {
    const fieldsResponse = await client.getFieldsByAppId(appId, pagingRequest);

    if (fieldsResponse.isSuccessful === false || fieldsResponse.data === null) {
      throw new Error(
        `${fieldsResponse.message} (${fieldsResponse.statusCode})`,
      );
    }

    yield* fieldsResponse.data.items;
    pagingRequest.pageNumber++;
    totalPages = fieldsResponse.data.totalPages;
  } while (pagingRequest.pageNumber <= totalPages);
}
