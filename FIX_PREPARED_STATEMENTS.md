# Fix "Prepared Statement Already Exists" Error

## Problem

You're getting intermittent errors:
- `prepared statement "sX" already exists` (code 42P05)
- `bind message supplies X parameters, but prepared statement requires Y` (code 08P01)
- Sometimes data loads, sometimes it doesn't

## Root Cause

**Supabase Transaction Mode Connection Pooling does NOT support prepared statements**, but Prisma uses them by default. This causes conflicts when multiple requests reuse connections.

## Solution: Add `?pgbouncer=true` to DATABASE_URL

Prisma needs to know you're using PgBouncer (connection pooling) so it disables prepared statements.

### Step 1: Update DATABASE_URL in Vercel

Go to **Vercel → Settings → Environment Variables** and update `DATABASE_URL`:

**Current (WRONG):**
```
postgresql://postgres.tngzqalzwrtlazlzooou:C%40B%40U%40R%40A%40N@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
```

**Correct (ADD `pgbouncer=true`):**
```
postgresql://postgres.tngzqalzwrtlazlzooou:C%40B%40U%40R%40A%40N@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
```

**Key changes:**
- Added `pgbouncer=true` parameter
- This tells Prisma to disable prepared statements
- Keep `sslmode=require` for security

### Step 2: Optional - Add DIRECT_URL for Migrations

If you need to run migrations, add a `DIRECT_URL` environment variable:

```
DIRECT_URL=postgresql://postgres:C%40B%40U%40R%40A%40N@db.tngzqalzwrtlazlzooou.supabase.co:5432/postgres?sslmode=require
```

Then update `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**Note**: This is optional. You can run migrations using the direct connection URL temporarily.

### Step 3: Redeploy

After updating the environment variable, Vercel will automatically redeploy, or trigger a redeploy manually.

## Why This Works

- `pgbouncer=true` tells Prisma you're using PgBouncer connection pooling
- Prisma automatically disables prepared statements when this flag is set
- This prevents the "prepared statement already exists" errors
- Connection pooling works correctly with transaction mode

## Alternative: Use Session Mode (Not Recommended)

If you still have issues, you could switch to **Session mode** connection pooling, which supports prepared statements. However, Transaction mode is better for serverless/Vercel.

Session mode URL format:
```
postgresql://postgres.tngzqalzwrtlazlzooou:C%40B%40U%40R%40A%40N@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require
```

Note: Port is `5432` (not `6543`) for session mode.

## Verify It Works

After updating:
1. ✅ No more "prepared statement already exists" errors
2. ✅ Consistent data loading (no more intermittent failures)
3. ✅ All API endpoints work reliably
4. ✅ Check Vercel logs - should see successful queries

## Summary

**The fix is simple**: Add `?pgbouncer=true` to your `DATABASE_URL` in Vercel environment variables. This tells Prisma to disable prepared statements, which fixes all the connection pooling issues.
