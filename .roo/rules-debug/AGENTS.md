# Debug Mode Rules (Non-Obvious Only)

## Log Locations

- API errors: Check browser Network tab → Response body
- Server logs: Terminal running `npm run dev`
- Supabase errors: Check Supabase Dashboard → Logs

## Common Silent Failures

- JWT token expired sau 24h → user cần login lại
- RLS policies block queries → check Supabase RLS settings
- `createServiceClient()` vs `createClient()` → service role bypass RLS, anon key không

## Debugging Tips

- Timezone issues: So sánh `new Date()` vs `getVietnamTimestamp()` - phải khác 7 giờ
- Import failures: Check `lib/advanced-excel-parser.ts` confidence scores
- Signature failures: Check unique constraints trong database

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET
```
