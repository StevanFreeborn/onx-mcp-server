# Onspring MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server implementation that integrates with Onspring's API, allowing AI assistants to access and manipulate data stored in Onspring instances.

## Description

This server provides a bridge between AI assistants and Onspring instances through the Model Context Protocol. It enables MCP clients to read and interact with your Onspring data, providing capabilities like:

- Retrieving lists of apps and their fields
- Fetching records from apps
- Running queries against apps
- Accessing report data
- Retrieve files from attachment fields

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Available Tools](#available-tools)
- [Development](#development)
- [License](#license)

## Installation

### Prerequisites

- Node.js
- An Onspring instance with API access
- An Onspring API key with appropriate permissions

### Installation Steps

1. Install the package globally:

```bash
npm install -g @stevanfreeborn/onx-mcp-server
```

Or use it directly via npx:

```bash
npx @stevanfreeborn/onx-mcp-server
```

### Building from Source

If you want to build from source:

```bash
# Clone the repository
git clone https://github.com/your-username/onx-mcp-server.git
cd onx-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

## Usage

In order to use the server, you will need to configure it in the MCP client of your choice. Each MCP client should provide instructions on setting up a MCP server. You will also need to make sure the required environment variables are set. See the [Configuration](#configuration) section for more details.

## Configuration

The server requires that the following environment variables are set:

| Variable            | Description                       | Default                    |
| ------------------- | --------------------------------- | -------------------------- |
| `ONSPRING_API_KEY`  | Your Onspring API key             | (Required)                 |
| `ONSPRING_BASE_URL` | The base URL for the Onspring API | <https://api.onspring.com> |

### Connecting to Claude Desktop

[Claude Desktop](https://claude.ai/download) is a popular MCP client. To connect the Onspring MCP server to Claude Desktop, follow these steps:

1. Find the `claude_desktop_config.json` file. Please reference this documentation for more information on where to find this file: [For Claude Desktop Users](https://modelcontextprotocol.io/quickstart/user).

2. Open the `claude_desktop_config.json` file in a text editor and add the following configuration:

```json
{
  "mcpServers": {
    "onx-mcp-server": {
      "command": "npx",
      "args": ["-y", "@stevanfreeborn/onx-mcp-server"],
      "env": {
        "ONSPRING_API_KEY": "your_onspring_api_key",
        "ONSPRING_BASE_URL": "https://api.onspring.com"
      }
    }
  }
}
```

> [!NOTE]
> The specific command and arguments may vary based on your setup.

## Available Tools

The MCP Server exposes the following tools for AI assistants to interact with Onspring:

### checkConnectionTool

Verifies that the server can connect to the Onspring API using the provided credentials.

### getAppsTool

Retrieves a list of all accessible apps in the Onspring instance.

### getFieldsTool

Gets all fields for a specified app.

**Parameters:**

- `name`: The name of the app

### getRecordsTool

Retrieves records from an app with specified fields.

**Parameters:**

- `appName`: The name of the app
- `fields`: Array of field names to retrieve
- `pageNumber`: The page number to start from (1-based)
- `numberOfPages`: The number of pages to retrieve

### getReportsTool

Gets all reports available for a specified app.

**Parameters:**

- `appName`: The name of the app

### getReportDataTool

Retrieves data from a specified report.

**Parameters:**

- `appName`: The name of the app
- `reportName`: The name of the report
- `dataType`: The type of report data to retrieve (optional)

### queryRecordsTool

Queries records from an app using a filter.

**Parameters:**

- `appName`: The name of the app
- `fields`: Array of field names to retrieve
- `filter`: A filter object to restrict the results
- `pageNumber`: The page number to start from (1-based)
- `numberOfPages`: The number of pages to retrieve

### getFileTool

Retrieves a file stored in an attachment field.

**Parameters:**

- `appName`: The name of the app
- `fieldName`: The name of the attachment field
- `recordId`: The ID of the record containing the file
- `fileName`: The name of the file to retrieve

## Development

### Setup Development Environment

```bash
# Install dependencies
npm install

# Run in development mode (watches for changes)
npm run dev
```

### Testing

The project uses Vitest for testing:

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Inspecting the Server

You can use the MCP Inspector to test the server:

```bash
npm run inspect
```

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
