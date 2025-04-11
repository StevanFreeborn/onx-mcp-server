import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { checkConnectionTool, getAppsTool, getFieldsTool } from "./tools.js";
import { createOnspringClient } from "./utils.js";
import { z } from "zod";

const server = new McpServer({
  name: "onx-mcp-server",
  version: "0.0.0",
});

const client = createOnspringClient();

server.tool(
  "check-onspring-connection",
  "Checks if you can connect to the Onspring instance",
  checkConnectionTool(client),
);

server.tool(
  "get-apps",
  "Retrieves a list of apps from the Onspring instance",
  getAppsTool(client),
);

server.tool(
  "get-fields",
  "Retrieves a list of fields from the Onspring instance for a particular app",
  { appName: z.string().min(1, "App name is required") },
  ({ appName }, req) => {
    const tool = getFieldsTool(client, appName);
    return tool(req);
  },
);

export { server };
