# UFI Web Server

面向 Root Android 13 + Termux + Cloudflare Tunnel 的独立 Web 服务。React/Vite 负责页面，Fastify 提供 API、静态文件和 SPA fallback；GitHub Releases 用于版本发布，Termux 设备执行校验、原子切换和失败回滚。

## 本地开发

```bash
npm install
npm run build
```

构建后，将 `apps/web/dist` 作为服务端的 `PUBLIC_DIR`。开发阶段可分别运行 Vite 和 Fastify，生产发布由 GitHub Actions 生成压缩包。

## Termux 准备

```bash
pkg install nodejs-lts curl jq coreutils termux-services
mkdir -p ~/services/ufi-web/{releases,updater}
```

复制 `deploy/update.sh`、`deploy/rollback.sh` 到 `~/services/ufi-web/updater/`，把 `deploy/service/run` 放到 `$PREFIX/var/service/ufi-web/run`，并赋予执行权限。设置 `GITHUB_REPO=owner/repository`；私有仓库额外设置只读的 `GITHUB_TOKEN`。

Cloudflare Tunnel 的 origin 使用 `http://127.0.0.1:3000`。

## Cloudflare Tunnel 与 TUI

Cloudflare Tunnel 作为独立的 `cloudflared` runit 服务运行。配置文件、credentials 和 token 只放在设备本地：

```bash
mkdir -p ~/.config/ufi-web "$PREFIX/var/service/cloudflared"
cp deploy/cloudflared.env.example ~/.config/ufi-web/cloudflared.env
chmod 600 ~/.config/ufi-web/cloudflared.env
```

将 `deploy/service/cloudflared/run` 复制到 `$PREFIX/var/service/cloudflared/run`，把 `config.yml` 放在 `~/.cloudflared/config.yml`，然后：

```bash
chmod +x "$PREFIX/var/service/cloudflared/run"
sv up cloudflared
```

日志统一写入 `$HOME/services/ufi-web/logs/`，使用 UTF-8 编码并带中文状态消息。安装 `dialog` 后可运行 TUI：

```bash
pkg install dialog
mkdir -p "$PREFIX/bin"
cp deploy/tui/ufi "$PREFIX/bin/ufi"
chmod +x "$PREFIX/bin/ufi"
ufi
```
