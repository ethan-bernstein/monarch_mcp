import { FastMCP } from 'fastmcp';
import { z } from "zod";
import { readServerDescription, requestFromMonarch } from './monarchProxy.js';
import type { McpServerDescription } from './types.js';

// Read the Monarch server description and create and start the server.
// For debuggability, if we have an error, we create a dummy server instead
// that surfaces the error message.
readServerDescription().then(createServer).catch(err => createErrorServer(err.message));

let server: FastMCP;
function createServer(serverSpec: McpServerDescription) {
  server = new FastMCP({
    name: serverSpec.name,
    version: serverSpec.version,
  });

  for (const tool of serverSpec.tools) {
    const parameters = {};
    for (const param of tool.parameters) {
      parameters[param.name] = getArg(param.type, param.isOptional);
    }

    const argsDescription = tool.parameters.map(param => {
      return `${param.name}: ${param.description}`;
    }).join('\n');
    const description = `${tool.description}\nArgs:\n${argsDescription}`;

    server.addTool({
      name: tool.name,
      description,
      parameters: z.object(parameters),
      execute: async (args) => {
        return requestFromMonarch(tool.name, args);
      },
    });
  }

  server.start({
    transportType: "stdio",
  });
}

function createErrorServer(errorMessage: string) {
  server = new FastMCP({
    name: 'Error',
    version: '0.0.0',
  });

  server.addTool({
    name: 'error',
    description: errorMessage,
    parameters: z.object({}),
    execute: async () => {
      return errorMessage;
    },
  });

  server.start({
    transportType: "stdio",
  });
}

function getArg(type: string, isOptional?: boolean): z.ZodType<any> {
  let arg;
  switch (type) {
    case 'string':
      arg = z.string();
      break;
    case 'number':
      arg = z.number();
      break;
    case 'boolean':
      arg = z.boolean();
      break;
    default:
      throw new Error(`Unknown type: ${type}`);
  }

  return !!isOptional ? arg.optional() : arg;
}
