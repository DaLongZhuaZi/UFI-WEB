import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function App() {
  const [health, setHealth] = useState<string>("检查中…");
  useEffect(() => { fetch("/health").then(r => r.json()).then(x => setHealth(`${x.status} · ${x.version}`)).catch(() => setHealth("服务不可用")); }, []);
  return <main><h1>UFI Web</h1><p>React 页面已通过 GitHub 发布结构部署。</p><span className="status">服务状态：{health}</span></main>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
