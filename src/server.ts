import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { checkConnectionTool, getAppsTool, getFieldsTool, getRecordsTool, getReportDataTool, getReportsTool } from "./tools.js";
import { createOnspringClient } from "./utils.js";
import { z } from "zod";
import { ReportDataType } from "onspring-api-sdk";

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

server.tool(
  "get-records", 
  "Retrieves a list of records from an app or survey in the Onspring instance", 
  {
    appName: z.string().min(1, "App name is required"),
    fields: z.array(z.string()).min(1, "At least one field is required"),
    pageNumber: z.number().optional().default(1),
    numberOfPages: z.number().optional().default(1),
  }, 
  ({ appName, fields, pageNumber, numberOfPages }, req) => {
    const tool = getRecordsTool(client, appName, fields, pageNumber, numberOfPages);
    return tool(req);
  }
);

server.tool(
  "get-reports",
  "Retrieves a list of reports from the Onspring instance for a particular app",
  {
    appName: z.string().min(1, "App name is required"),
  },
  ({ appName }, req) => {
    const tool = getReportsTool(client, appName);
    return tool(req);
  },
);

server.tool(
  "get-report-data",
  "Retrieves the data for a specific report from the Onspring instance",
  {
    appName: z.string().min(1, "App name is required"),
    reportName: z.string().min(1, "Report name is required"),
    dataType: z.enum([ReportDataType.ReportData, ReportDataType.ChartData]).default(ReportDataType.ReportData),
  },
  ({ appName, reportName, dataType }, req) => {
    const tool = getReportDataTool(client, appName, reportName, dataType);
    return tool(req);
  },
);

export { server };
