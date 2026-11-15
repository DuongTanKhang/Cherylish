import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
const root = "/app";
const envFor = (extra = {}) => ({ ...process.env, ...extra });
const migration = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { cwd: `${root}/api`, env: envFor({ NODE_ENV: "development" }), stdio: "inherit" });
if (migration.status !== 0) process.exit(migration.status || 1);
const adminBootstrap = spawnSync(process.execPath, ["scripts/bootstrap-admin.mjs"], { cwd: `${root}/api`, env: process.env, stdio: "inherit" });
if (adminBootstrap.status !== 0) process.exit(adminBootstrap.status || 1);
const specs = [
  { name: "geme-api", cwd: `${root}/api`, args: [`${root}/api/dist/main.js`], env: { NODE_ENV: "development", PORT: "4000" } },
  { name: "admin", cwd: `${root}/admin`, args: [`${root}/admin/node_modules/next/dist/bin/next`, "start", "--hostname", "0.0.0.0", "--port", "3001"], env: { NODE_ENV: "production", GEME_API_BASE_URL: "http://127.0.0.1:4000/api/v1", AEGIS_AUTH_API_URL: process.env.AEGIS_AUTH_API_URL || "http://aegis:5130" } },
];
const children = new Map();
let stopping = false;
function start(spec) {
  if (stopping) return;
  const child = spawn(process.execPath, spec.args, { cwd: spec.cwd, env: envFor(spec.env), stdio: "inherit" });
  children.set(spec.name, child);
  child.on("exit", async (code, signal) => {
    children.delete(spec.name);
    if (!stopping) { console.error(`[supervisor] ${spec.name} exited (${signal || code}); restarting in 3s`); await delay(3000); start(spec); }
  });
}
for (const spec of specs) start(spec);
function stop() { if (stopping) return; stopping = true; for (const child of children.values()) child.kill("SIGTERM"); setTimeout(() => { for (const child of children.values()) child.kill("SIGKILL"); }, 8000).unref(); }
process.on("SIGTERM", stop); process.on("SIGINT", stop);
await new Promise((resolve) => process.on("exit", resolve));
