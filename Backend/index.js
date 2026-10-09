// Configurations
import { PORT, JWT_CONFIG, CORS_ORIGINS } from "./src/config.js";

// Fastify server setup
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";

// Import routes
import routes from "./src/routes.js";

const app = Fastify({ logger: false });

await app.register(cors, {
  origin: CORS_ORIGINS,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});
await app.register(jwt, {
  secret: JWT_CONFIG.secret,
  sign: { expiresIn: JWT_CONFIG.expiresIn },
});

await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
await app.register(multipart, { limits: { files: 1, fields: 5, fileSize: 15 * 1024 * 1024 } });

await app.register(routes, { prefix: "/api" });

try {
  await app.listen({ port: Number(PORT) || 3000, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
