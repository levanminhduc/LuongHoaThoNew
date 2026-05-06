#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DENY_FILE="$SCRIPT_DIR/scope-denylist.txt"

RG_BIN="rg"
if ! command -v "$RG_BIN" >/dev/null 2>&1; then
  if command -v rg.exe >/dev/null 2>&1; then
    RG_BIN="rg.exe"
  fi
fi

if ! command -v "$RG_BIN" >/dev/null 2>&1; then
  echo "ripgrep (rg) required" >&2
  exit 2
fi

if [ "$#" -lt 1 ]; then
  echo "usage: $0 <dir1> [dir2] ..." >&2
  exit 2
fi

GLOBS=()
while IFS= read -r line; do
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  GLOBS+=("--glob" "!${line}/**" "--glob" "!${line}")
done < "$DENY_FILE"

if "$RG_BIN" --pcre2 --version >/dev/null 2>&1; then
  "$RG_BIN" --no-heading --line-number --color never --pcre2 \
    "(?<![\.\w])fetch\s*\(" \
    "${GLOBS[@]}" \
    --type-add 'tsx:*.tsx' --type-add 'ts:*.ts' --type tsx --type ts \
    "$@" || true
else
  "$RG_BIN" --no-heading --line-number --color never \
    "\\bfetch\\s*\\(" \
    "${GLOBS[@]}" \
    --type-add 'tsx:*.tsx' --type-add 'ts:*.ts' --type tsx --type ts \
    "$@" \
    | grep -Ev "\\.(pre|re)?fetch\\s*\\(|prefetch\\s*\\(|refetch\\s*\\(|function\\s+fetch\\s*\\(|async\\s+fetch\\s*\\(" || true
fi
