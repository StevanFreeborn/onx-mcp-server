import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from "./server.js";

try {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Onx MCP Server running on stdio");
} catch (error) {
  console.error("Fatal error in main():", error);
  process.exit(1);
}
