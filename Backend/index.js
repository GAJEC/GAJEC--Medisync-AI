// Configurations
import { PORT } from "./src/config.js";

// Fastify server setup
import Fastify from "fastify";
import cors from "@fastify/cors";

// Import routes
import routes from "./src/routes.js";

const app = Fastify({ logger: false });

await app.register(cors);
await app.register(routes, { prefix: "/api" });

try {
  await app.listen({ port: Number(PORT) || 3000, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
