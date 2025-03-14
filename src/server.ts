import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OnspringClient } from "onspring-api-sdk";
import { z } from "zod";
import { createOnspringClient } from "./functions.js";

const server = new McpServer({
  name: "onx-mcp-server",
  version: "0.0.0",
});

server.tool("check-onspring-connection", async () => {
  try {
    const client = createOnspringClient();
    const canConnect = await client.canConnect();

    return {
      content: [
        { type: "text", text: canConnect ? "Connected" : "Not connected" },
      ],
    };
  } catch (error) {
    let errorMessage = "Unable to connect Onspring";

    if (error instanceof Error) {
      errorMessage = errorMessage + ": " + error.message;
    }

    return {
      content: [{ type: "text", text: errorMessage }],
    };
  }
});

server.tool(
  "get-apps",
  async () => {
    try {
      const client = createOnspringClient();
      const appsResponse = await client.getApps();

      if (appsResponse.isSuccessful === false || appsResponse.data === null) {
        throw new Error(`Unable to get apps: ${appsResponse.message} (${appsResponse.statusCode})`);
      }

      return {
        content: [{ type: "text", text: JSON.stringify(appsResponse.data.items) }],
      };
    } catch (error) {
      console.error(error);

      let errorMessage = "Unable to get apps";

      if (error instanceof Error) {
        errorMessage = errorMessage + ": " + error.message;
      }

      return {
        content: [{ type: "text", text: errorMessage }],
      };
    }
  },
);

export { server };
