import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { checkConnectionTool, getAppsTool } from "./tools.js";
import { createOnspringClient } from "./utils.js";

const server = new McpServer({
  name: "onx-mcp-server",
  version: "0.0.0",
});

const client = createOnspringClient();

server.tool(
  "check-onspring-connection",
  "A tool that allows you to check if you can connect to an Onspring instance",
  checkConnectionTool(client)
);

server.tool(
  "get-apps",
  "A tool that allows you to get a list of apps from an Onspring instance",
  getAppsTool(client)
);

export { server };
