#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail
BASE="${BASE:-$HOME/services/ufi-web}"
REPO="${GITHUB_REPO:?Set GITHUB_REPO, for example owner/ufi-web-server}"
API="https://api.github.com/repos/$REPO/releases/latest"
RELEASES="$BASE/releases"; TMP="$BASE/.tmp"; mkdir -p "$RELEASES" "$TMP"
AUTH=(); test -n "${GITHUB_TOKEN:-}" && AUTH=(-H "Authorization: Bearer $GITHUB_TOKEN")
META="$(curl -fsSL "${AUTH[@]}" -H 'Accept: application/vnd.github+json' "$API")"
TAG="$(printf '%s' "$META" | jq -r .tag_name)"; test "$TAG" != null
ARCHIVE="ufi-web-$TAG.tar.gz"; SHA="$ARCHIVE.sha256"
URL="$(printf '%s' "$META" | jq -r --arg n "$ARCHIVE" '.assets[]|select(.name==$n)|.browser_download_url')"
SHA_URL="$(printf '%s' "$META" | jq -r --arg n "$SHA" '.assets[]|select(.name==$n)|.browser_download_url')"
test -n "$URL" -a "$URL" != null -a -n "$SHA_URL" -a "$SHA_URL" != null
TARGET="$RELEASES/$TAG"; test -d "$TARGET" && { echo "$TAG already installed"; exit 0; }
rm -rf "$TMP/$TAG"; mkdir -p "$TMP/$TAG"
curl -fsSL "${AUTH[@]}" -o "$TMP/$ARCHIVE" "$URL"; curl -fsSL "${AUTH[@]}" -o "$TMP/$SHA" "$SHA_URL"
(cd "$TMP" && sha256sum -c "$SHA"); tar -xzf "$TMP/$ARCHIVE" -C "$TMP/$TAG"
mv "$TMP/$TAG" "$TARGET"
OLD="$(readlink "$BASE/current" 2>/dev/null || true)"; test -n "$OLD" && ln -sfn "$OLD" "$BASE/previous"
ln -sfn "$TARGET" "$BASE/current"; sv restart ufi-web
sleep 2
curl -fsS "http://127.0.0.1:${PORT:-3000}/health" >/dev/null || { echo 'Health check failed, rolling back'; "$BASE/updater/rollback.sh"; exit 1; }
echo "Updated to $TAG"
