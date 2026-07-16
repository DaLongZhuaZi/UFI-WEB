import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.env.APP_ROOT ?? process.cwd();
const publicDir = process.env.PUBLIC_DIR ?? join(root, "public");
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
const version = process.env.APP_VERSION ?? "dev";
const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok", version, timestamp: new Date().toISOString() }));
app.get("/api/status", async () => ({ service: "ufi-web", version, deviceApi: process.env.DEVICE_API_URL ?? "http://127.0.0.1:2333" }));

if (existsSync(publicDir)) {
  await app.register(fastifyStatic, { root: publicDir, prefix: "/" });
  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith("/api/") || request.url === "/health") return reply.code(404).send({ error: "Not found" });
    return reply.sendFile("index.html");
  });
}

await app.listen({ port, host });
