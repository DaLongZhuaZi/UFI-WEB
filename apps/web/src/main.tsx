import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function App() {
  const [health, setHealth] = useState<string>("检查中…");
  const [tunnel, setTunnel] = useState<any>(null);
  useEffect(() => { fetch("/health").then(r => r.json()).then(x => setHealth(`${x.status} · ${x.version}`)).catch(() => setHealth("服务不可用")); }, []);
  useEffect(() => { fetch("/api/cloudflare/status").then(r => r.json()).then(setTunnel).catch(() => setTunnel({ error: "Tunnel 状态读取失败" })); }, []);
  return <main><h1>UFI Web</h1><p>React 页面已通过 GitHub 发布结构部署。</p><span className="status">服务状态：{health}</span>
    <section><h2>Cloudflare Tunnel</h2>{!tunnel ? <p>正在读取连接状态…</p> : tunnel.error ? <p>{tunnel.error}</p> : <>
      <div className={tunnel.local.running ? "badge online" : "badge offline"}>{tunnel.local.running ? "已连接 / 正在运行" : "未运行"}</div>
      <dl><dt>本地服务</dt><dd>{tunnel.local.serviceStatus}</dd><dt>账户 ID</dt><dd>{tunnel.local.accountId ?? "未识别"}</dd><dt>Tunnel ID</dt><dd>{tunnel.local.tunnelId ?? "未识别"}</dd></dl>
      {tunnel.remote.available ? <><h3>Cloudflare 远程信息</h3><dl><dt>名称</dt><dd>{tunnel.remote.tunnel.name}</dd><dt>状态</dt><dd>{tunnel.remote.tunnel.status}</dd><dt>创建时间</dt><dd>{tunnel.remote.tunnel.createdAt}</dd><dt>连接数</dt><dd>{tunnel.remote.tunnel.connections.length}</dd></dl></> : <p className="hint">远程信息不可用：{tunnel.remote.reason}</p>}
      <details><summary>最近 Tunnel 日志</summary><pre>{tunnel.local.recentLogs.join("\n") || "暂无日志"}</pre></details>
    </>}</section>
  </main>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
