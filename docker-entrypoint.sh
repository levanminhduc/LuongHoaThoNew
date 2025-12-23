#!/bin/sh
set -e

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "Error: NEXT_PUBLIC_SUPABASE_URL is not set"
  exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "Error: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set"
  exit 1
fi

echo "Injecting runtime environment variables..."

find /app/.next \( -name "*.js" -o -name "*.json" \) -type f | while read file; do
  if grep -q "https://placeholder.supabase.co\|placeholder-anon-key" "$file" 2>/dev/null; then
    sed -i "s|https://placeholder.supabase.co|${NEXT_PUBLIC_SUPABASE_URL}|g" "$file"
    sed -i "s|placeholder-anon-key|${NEXT_PUBLIC_SUPABASE_ANON_KEY}|g" "$file"
  fi
done

echo "Environment variables injected successfully"
echo "Starting Next.js server..."

exec node server.js
