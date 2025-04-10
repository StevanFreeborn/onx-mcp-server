import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OnspringClient } from "onspring-api-sdk";

export function checkConnectionTool(client: OnspringClient): ToolCallback {
  if (!client) {
    throw new Error("Unable to create checkConnectionTool because client is not set");
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
      let errorMessage = "Unable to connect to Onspring";

      if (error instanceof Error && error.message) {
        errorMessage = errorMessage + ": " + error.message;
      }

      return {
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
      const appsResponse = await client.getApps();

      if (appsResponse.isSuccessful === false || appsResponse.data === null) {
        throw new Error(
          `Unable to get apps: ${appsResponse.message} (${appsResponse.statusCode})`,
        );
      }

      return {
        content: [{ type: "text", text: JSON.stringify(appsResponse.data.items) }],
      };
    } catch (error) {
      console.error(error);

      let errorMessage = "Unable to get apps";

      if (error instanceof Error && error.message) {
        errorMessage = errorMessage + ": " + error.message;
      }

      return {
        content: [{ type: "text", text: errorMessage }],
      };
    }
  };
}
