#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail
export LANG="${LANG:-zh_CN.UTF-8}" LC_ALL="${LC_ALL:-C.UTF-8}"
BASE="${BASE:-$HOME/services/ufi-web}"
REPO="${GITHUB_REPO:-DaLongZhuaZi/UFI-WEB}"
RELEASE_BASE="https://github.com/$REPO/releases/latest/download"
PREFIXES=("" "https://gh-proxy.com/" "https://ghproxy.net/" "https://ghfast.top/")
RELEASES="$BASE/releases"; TMP="$BASE/.tmp"; LOG_DIR="$BASE/logs"
SOURCE_STATE="$BASE/.download-source"
mkdir -p "$RELEASES" "$TMP" "$LOG_DIR"
log() { printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$*" | tee -a "$LOG_DIR/update.log"; }
download() {
  local relative="$1" destination="$2" prefix url attempt remembered
  local -a ordered=()
  remembered=""
  test -f "$SOURCE_STATE" && remembered="$(head -n 1 "$SOURCE_STATE" | tr -d '\r\n')"
  if test -n "$remembered"; then ordered+=("$remembered"); fi
  for prefix in "${PREFIXES[@]}"; do
    test "$prefix" = "$remembered" && continue
    ordered+=("$prefix")
  done
  rm -f "$destination.part"
  for prefix in "${ordered[@]}"; do
    url="${prefix}${RELEASE_BASE}/${relative}"
    log "尝试下载：$url"
    for attempt in 1 2; do
      if curl -fL --connect-timeout 6 --max-time 180 --speed-time 15 --speed-limit 1024 --retry 1 --retry-delay 2 --retry-all-errors -o "$destination.part" "$url"; then
        mv "$destination.part" "$destination"
        printf '%s\n' "$prefix" > "$SOURCE_STATE"
        log "下载成功：$relative"
        return 0
      fi
      log "第 $attempt 次下载失败，准备重试或切换线路。"
      rm -f "$destination.part"
    done
  done
  log "所有下载线路均失败：$relative"
  return 1
}
download VERSION "$TMP/VERSION"
TAG="$(tr -d '\r\n' < "$TMP/VERSION")"
test -n "$TAG" && case "$TAG" in *[!A-Za-z0-9._-]*) log "版本号格式非法。"; exit 1;; esac
ARCHIVE="ufi-web-latest.tar.gz"; SHA="$ARCHIVE.sha256"
TARGET="$RELEASES/$TAG"
test -d "$TARGET" && { log "$TAG 已经安装，无需更新。"; exit 0; }
download "$ARCHIVE" "$TMP/$ARCHIVE"
download "$SHA" "$TMP/$SHA"
(cd "$TMP" && sha256sum -c "$SHA") || { log "SHA-256 校验失败，拒绝安装。"; exit 1; }
rm -rf "$TMP/$TAG"; mkdir -p "$TMP/$TAG"
tar -xzf "$TMP/$ARCHIVE" -C "$TMP/$TAG"
test "$(tr -d '\r\n' < "$TMP/$TAG/VERSION")" = "$TAG" || { log "压缩包版本与 VERSION 不一致。"; exit 1; }
mv "$TMP/$TAG" "$TARGET"
log "正在安装服务端生产依赖。"
(cd "$TARGET" && npm install --omit=dev --ignore-scripts)
OLD="$(readlink "$BASE/current" 2>/dev/null || true)"; test -n "$OLD" && ln -sfn "$OLD" "$BASE/previous"
ln -sfn "$TARGET" "$BASE/current"
SERVICE_DIR="${SERVICE_DIR:-$PREFIX/var/service/ufi-web}"
if test ! -d "$SERVICE_DIR"; then
  log "版本安装完成，但服务目录不存在：$SERVICE_DIR"
  exit 0
fi
sv restart ufi-web
sleep 2
curl -fsS --connect-timeout 3 --max-time 8 "http://127.0.0.1:${PORT:-3000}/health" >/dev/null || { log "健康检查失败，开始回滚。"; "$BASE/updater/rollback.sh"; exit 1; }
log "更新成功：$TAG"
