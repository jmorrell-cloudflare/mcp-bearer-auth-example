import app from "./app";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BearerAuthProvider } from "./bearerAuthProvider";

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

// BearerAuthProvider version
export default new BearerAuthProvider({
  apiRoute: "/sse",
  // @ts-ignore
  apiHandler: MyMcp.mount("/sse", {
    binding: "MCP_OBJECT",
    corsOptions: {
      origin: "*",
      methods: "GET, POST, OPTIONS",
      headers: "Content-Type, Authorization",
    },
  }),
  // @ts-ignore
  defaultHandler: app,
  // custom validation
  validateToken: async (token: string) => {
    if (token.length !== 4) {
      return new Error("Invalid token: Must be 4 characters long");
    }
    return null;
  },
});

// More explicit / less magic version
// This is approximately what the BearerAuthProvider does under the hood
//
// const mcpAgent = MyMcp.mount("/sse", {
//   binding: "MCP_OBJECT",
//   corsOptions: {
//     origin: "*",
//     methods: "GET, POST, OPTIONS",
//     headers: "Content-Type, Authorization",
//   },
// });
//
// export default {
//   async fetch(request: Request, env: Env, ctx: ExecutionContext) {
//     const basePattern = new URLPattern({ pathname: "/sse" });
//     const messagePattern = new URLPattern({ pathname: "/sse/message" });

//     if (basePattern.test(request.url) || messagePattern.test(request.url)) {
//       const accessToken = request.headers
//         .get("Authorization")
//         ?.replace("Bearer ", "");

//       if (!accessToken) {
//         return new Response("Unauthorized", { status: 401 });
//       }

//       // pass any info we need in the agent via ctx.props
//       // this will be available in the agent via `this.props`
//       // and McpAgent will handle storing / restoring it as
//       // the agent is hibernated / resumed
//       ctx.props = {
//         accessToken,
//       };

//       // @ts-ignore
//       return mcpAgent.fetch(request, env, ctx);
//     }

//     return app.fetch(request);
//   },
// };
