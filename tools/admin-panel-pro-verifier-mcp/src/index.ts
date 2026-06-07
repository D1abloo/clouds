#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { TOOL_NAMES, toolHandlers } from './tools/index.js'

const server = new McpServer({
  name: 'admin-panel-pro-verifier-mcp',
  version: '1.0.0',
})

for (const name of TOOL_NAMES) {
  server.tool(
    name,
    `CloudOps admin panel PRO verifier — ${name.replace(/_/g, ' ')}`,
    {},
    async () => toolHandlers[name](),
  )
}

const transport = new StdioServerTransport()
await server.connect(transport)
