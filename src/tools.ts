import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { App, OnspringClient, PagingRequest } from "onspring-api-sdk";

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
      const apps: App[] = [];
      const pagingRequest = new PagingRequest(1, 100);
      let totalPages = 1;

      do {
        const appsResponse = await client.getApps(pagingRequest);

        if (appsResponse.isSuccessful === false || appsResponse.data === null) {
          throw new Error(`${appsResponse.message} (${appsResponse.statusCode})`);
        }

        apps.push(...appsResponse.data.items);
        pagingRequest.pageNumber++;
        totalPages = appsResponse.data.totalPages;
      } while (pagingRequest.pageNumber <= totalPages);

      return {
        content: [
          { type: "text", text: JSON.stringify(apps) },
        ],
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
