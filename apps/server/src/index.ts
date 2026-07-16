import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const root = process.env.APP_ROOT ?? process.cwd();
const publicDir = process.env.PUBLIC_DIR ?? join(root, "public");
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
const version = process.env.APP_VERSION ?? "dev";
const app = Fastify({ logger: true });
const execFileAsync = promisify(execFile);

function decodeTunnelToken(token?: string) {
  if (!token) return {};
  try {
    const value = JSON.parse(Buffer.from(token, "base64").toString("utf8")) as { a?: string; t?: string };
    return { accountId: value.a, tunnelId: value.t };
  } catch {
    return {};
  }
}

async function localTunnelStatus() {
  let serviceStatus = "未知";
  try { serviceStatus = (await execFileAsync("sv", ["status", "cloudflared"])).stdout.trim(); } catch (error: any) { serviceStatus = error?.stdout?.trim() || error?.message || "无法读取服务状态"; }
  const home = process.env.HOME ?? "";
  const logPath = process.env.CLOUDFLARED_LOG ?? join(home, "services/ufi-web/logs/cloudflared.log");
  let recentLogs: string[] = [];
  try {
    recentLogs = (await readFile(logPath, "utf8")).split(/\r?\n/).filter(Boolean).slice(-20);
    if (process.env.CLOUDFLARED_TOKEN) recentLogs = recentLogs.map(line => line.replaceAll(process.env.CLOUDFLARED_TOKEN!, "[敏感信息已隐藏]"));
  } catch { recentLogs = []; }
  const tokenMeta = decodeTunnelToken(process.env.CLOUDFLARED_TOKEN);
  return {
    serviceStatus,
    running: serviceStatus.startsWith("run:"),
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || tokenMeta.accountId || null,
    tunnelId: process.env.CLOUDFLARE_TUNNEL_ID || tokenMeta.tunnelId || null,
    recentLogs
  };
}

async function cloudflareRemoteInfo(accountId: string | null, tunnelId: string | null) {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!apiToken || !accountId || !tunnelId) return { available: false, reason: "未配置 Cloudflare 只读 API Token" };
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/cfd_tunnel/${tunnelId}`, { headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" } });
    const body: any = await response.json();
    if (!response.ok || !body.success) return { available: false, reason: body.errors?.[0]?.message || `Cloudflare API ${response.status}` };
    const tunnel = body.result;
    return { available: true, tunnel: { id: tunnel.id, name: tunnel.name, status: tunnel.status, createdAt: tunnel.created_at, deletedAt: tunnel.deleted_at, connections: tunnel.connections ?? [] } };
  } catch (error: any) {
    return { available: false, reason: error?.message || "Cloudflare API 请求失败" };
  }
}

app.get("/health", async () => ({ status: "ok", version, timestamp: new Date().toISOString() }));
app.get("/api/status", async () => ({ service: "ufi-web", version, deviceApi: process.env.DEVICE_API_URL ?? "http://127.0.0.1:2333" }));
app.get("/api/cloudflare/status", async () => {
  const local = await localTunnelStatus();
  const remote = await cloudflareRemoteInfo(local.accountId, local.tunnelId);
  return { local, remote, checkedAt: new Date().toISOString() };
});

if (existsSync(publicDir)) {
  await app.register(fastifyStatic, { root: publicDir, prefix: "/" });
  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith("/api/") || request.url === "/health") return reply.code(404).send({ error: "Not found" });
    return reply.sendFile("index.html");
  });
}

await app.listen({ port, host });
