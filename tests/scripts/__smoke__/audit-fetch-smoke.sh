#!/usr/bin/env bash
set -euo pipefail

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/scripts"
mkdir -p "$TMP/fixtures/app/admin/in-scope"
mkdir -p "$TMP/fixtures/app/employee/lookup"
mkdir -p "$TMP/fixtures/components"
mkdir -p "$TMP/fixtures/app/admin/backtick"
mkdir -p "$TMP/fixtures/app/admin/spaced"
mkdir -p "$TMP/fixtures/app/admin/multiline"
mkdir -p "$TMP/fixtures/app/admin/varbinding"
mkdir -p "$TMP/fixtures/lib/hooks"
mkdir -p "$TMP/fixtures/lib/api"

echo "fetch('/api/in-scope-admin')" > "$TMP/fixtures/app/admin/in-scope/page.tsx"
echo "fetch(\"/api/double-quote\")" >> "$TMP/fixtures/app/admin/in-scope/page.tsx"
echo 'fetch(`/api/backtick/${id}`)' > "$TMP/fixtures/app/admin/backtick/page.tsx"
echo 'fetch( "/api/spaced" )' > "$TMP/fixtures/app/admin/spaced/page.tsx"
printf 'fetch(\n  "/api/multiline"\n)\n' > "$TMP/fixtures/app/admin/multiline/page.tsx"
printf "const url = '/api/varbind';\nfetch(url);\n" > "$TMP/fixtures/app/admin/varbinding/page.tsx"
echo "fetch('/api/lookup')" > "$TMP/fixtures/app/employee/lookup/page.tsx"
echo "fetch('/api/component')" > "$TMP/fixtures/components/x.tsx"
echo "fetch(url)" > "$TMP/fixtures/lib/hooks/use-x.ts"
echo "fetch(input, init)" > "$TMP/fixtures/lib/api/client.ts"
mkdir -p "$TMP/fixtures/lib/hooks/false-positive"
printf "queryClient.prefetchQuery(...)\nresult.refetch()\n" > "$TMP/fixtures/lib/hooks/false-positive/use-y.ts"

cp tests/scripts/audit-fetch.sh "$TMP/scripts/audit-fetch.sh"
cp tests/scripts/scope-denylist.txt "$TMP/scripts/scope-denylist.txt"
chmod +x "$TMP/scripts/audit-fetch.sh"

cd "$TMP/fixtures"
RESULT=$("$TMP/scripts/audit-fetch.sh" app components lib/hooks lib/api 2>&1 || true)

echo "--- smoke result ---"
echo "$RESULT"
echo "--------------------"

echo "$RESULT" | grep -q "in-scope-admin" || { echo "FAIL: missing in-scope-admin"; exit 1; }
echo "$RESULT" | grep -q "double-quote" || { echo "FAIL: missing double-quote variant"; exit 1; }
echo "$RESULT" | grep -q "backtick" || { echo "FAIL: missing backtick variant"; exit 1; }
echo "$RESULT" | grep -q "spaced" || { echo "FAIL: missing spaced variant"; exit 1; }
echo "$RESULT" | grep -q "multiline" || { echo "FAIL: missing multiline variant"; exit 1; }
echo "$RESULT" | grep -q "varbinding" || { echo "FAIL: missing variable-indirection variant"; exit 1; }
echo "$RESULT" | grep -Eq "components[\\/]x" || { echo "FAIL: missing components/x"; exit 1; }
echo "$RESULT" | grep -Eq "lib[\\/]hooks[\\/]use-x" || { echo "FAIL: missing lib/hooks scope"; exit 1; }
if echo "$RESULT" | grep -q "lookup"; then
  echo "FAIL: lookup leaked into result"
  exit 1
fi
if echo "$RESULT" | grep -Eq "lib[\\/]api[\\/]client.ts"; then
  echo "FAIL: lib/api/client.ts not denylisted"
  exit 1
fi
if echo "$RESULT" | grep -q "false-positive"; then
  echo "FAIL: prefetch()/refetch() incorrectly flagged"
  exit 1
fi
echo "OK: audit-fetch.sh smoke passed (6 variants + lib/hooks scope + denylist)"
