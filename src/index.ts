import defaultHandler from "./app";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { bearerAuth } from "hono/bearer-auth";

type MyMcpProps = Record<string, unknown> & {
  accessToken: string;
};

export class MyMcp extends McpAgent<Env, unknown, MyMcpProps> {
  server = new McpServer({
    name: "Demo",
    version: "1.0.0",
  });

  async init() {
    // register tools
    console.log("accessToken", this.props.accessToken);

    this.server.tool(
      "add",
      { a: z.number(), b: z.number() },
      async ({ a, b }) => ({
        content: [{ type: "text", text: String(a + b) }],
      })
    );
  }
}

const app = new Hono<{ Bindings: Env }>();

app.use(
  "/sse",
  cors(),
  bearerAuth({
    verifyToken: async (token, c) => {
      // McpAgent expects `props` to be set on `executionCtx`
      c.executionCtx.props.accessToken = token;
      return token.length === 4;
    },
  })
);
app.mount(
  "/sse",
  MyMcp.mount("/sse", { binding: "MCP_OBJECT" }).fetch,
  // Hono's .mount normally rewrites pathnames, but skip that this time so MyMcp knows the real paths
  { replaceRequest: (req) => req }
);

// Alternative API, all in one routing call, no mutating of executionCtx

/*

app.on(['get', 'post'], '/sse/*', cors(), bearerAuth({
  verifyToken: async (token, c) => {
    c.set('accessToken', token)
    return token.length === 4
  }
}), (c) => {
  // Need a little bit of massaging to get Hono to call a standard worker .fetch API
  return MyMcp.mount("/sse", {
    binding: "MCP_OBJECT",
  }).fetch(c.req.raw, c.env, {...c.executionCtx, accessToken: c.get('accessToken') });
})

*/

// Serve the rest of the app on '/'
app.mount("/", defaultHandler.fetch);

export default app;
