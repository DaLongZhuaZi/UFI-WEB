#!/data/data/com.termux/files/usr/bin/bash
export LANG="${LANG:-zh_CN.UTF-8}" LC_ALL="${LC_ALL:-C.UTF-8}" LANGUAGE="${LANGUAGE:-zh_CN:zh}"
LOG_BASE="${LOG_BASE:-$HOME/services/ufi-web/logs}"
mkdir -p "$LOG_BASE"
log_file() { printf '%s/%s.log' "$LOG_BASE" "$1"; }
log() { local name="$1"; shift; printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$*" >> "$(log_file "$name")"; }
rotate_log() { local f; f="$(log_file "$1")"; test -f "$f" || return 0; test "$(wc -c < "$f")" -lt 5242880 || { mv "$f" "$f.$(date +%Y%m%d%H%M%S)"; touch "$f"; }; }
