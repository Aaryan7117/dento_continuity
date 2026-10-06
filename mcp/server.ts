import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root regardless of child process cwd
dotenv.config({ path: path.resolve(__dirname, "../.env") });
if (!process.env.DENTO_CLINIC_ID) {
  console.error("DENTO_CLINIC_ID is not set. The MCP server serves exactly one clinic; put its id in .env.");
  process.exit(1);
}
if (!process.env.DIRECT_DATABASE_URL) {
  console.error("DIRECT_DATABASE_URL is not set. Add it to the project's .env file.");
  process.exit(1);
}

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOLS, handleToolCall } from "./tools";
import { RESOURCES, handleResourceRead } from "./resources";
import { PROMPTS, handlePromptGet } from "./prompts";

const server = new Server(
  {
    name: "dento-continuity",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// ── Tool Handlers ──
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleToolCall(name, args || {});
    return {
      content: [
        {
          type: "text",
          text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `[DENTO MCP Error] Tool '${name}' failed: ${errorMessage}`,
        },
      ],
    };
  }
});

// ── Resource Handlers ──
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: RESOURCES };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  try {
    const resource = await handleResourceRead(uri);
    return {
      contents: [
        {
          uri: resource.uri,
          mimeType: resource.mimeType,
          text: resource.text,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`[DENTO MCP Error] Failed to read resource '${uri}': ${errorMessage}`);
  }
});

// ── Prompt Handlers ──
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: PROMPTS };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const prompt = await handlePromptGet(name, args as Record<string, string> | undefined);
    return prompt;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`[DENTO MCP Error] Failed to get prompt '${name}': ${errorMessage}`);
  }
});

// ── Start Server ──
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("[DENTO MCP] Server running on stdio (v0.1.0)\n");
}

main().catch((err) => {
  process.stderr.write(`[DENTO MCP Fatal] ${err?.message || err}\n`);
  process.exit(1);
});
