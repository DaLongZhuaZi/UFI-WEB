#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail
BASE="${BASE:-$HOME/services/ufi-web}"; test -L "$BASE/previous" || { echo 'No previous release'; exit 1; }; ln -sfn "$(readlink "$BASE/previous")" "$BASE/current"; sv restart ufi-web 2>/dev/null || true
