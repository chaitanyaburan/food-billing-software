# Fix Supabase Connection from Vercel

## Problem

Even with the correct DATABASE_URL, you're getting:
```
Can't reach database server at db.tngzqalzwrtlazlzooou.supabase.co:5432
```

This is a **network/firewall issue**, not a URL encoding issue.

## Solutions

### Solution 1: Use Supabase Connection Pooling (RECOMMENDED)

Supabase provides connection pooling URLs specifically for serverless environments like Vercel. This is the **best solution**.

#### Steps:

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Go to **Settings → Database**

2. **Find Connection Pooling Section**
   - Look for "Connection Pooling" or "Connection String"
   - You'll see different modes: **Transaction**, **Session**, and **Direct**

3. **Use Transaction Mode (Recommended for Vercel)**
   - Copy the **Transaction mode** connection string
   - It looks like: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
   - Port is **6543** (not 5432)

4. **Update DATABASE_URL in Vercel**
   - Go to Vercel → Settings → Environment Variables
   - Update `DATABASE_URL` with the connection pooling URL
   - Make sure to URL-encode the password if it has special characters

#### Why Connection Pooling?
- Handles many concurrent connections efficiently
- Optimized for serverless (Vercel) environments
- Better performance and reliability
- Supabase manages the connection pool

### Solution 2: Enable Supabase Database Access

If you want to use the direct connection (port 5432):

1. **Check Supabase Firewall Settings**
   - Go to Supabase Dashboard → Settings → Database
   - Look for "Network Restrictions" or "Allowed IPs"
   - Vercel uses dynamic IPs, so you might need to:
     - Allow all IPs (less secure)
     - Or use connection pooling (recommended)

2. **Verify Database is Running**
   - Check Supabase dashboard that your database is active
   - Look for any maintenance or paused status

### Solution 3: Add SSL Parameters

Your current URL has `?sslmode=require` which is good. Make sure it's:

```
postgresql://postgres:C%40B%40U%40R%40A%40N@db.tngzqalzwrtlazlzooou.supabase.co:5432/postgres?sslmode=require
```

For connection pooling, you might need:
```
postgresql://postgres.C%40B%40U%40R%40A%40N@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
```

## Quick Fix Steps

### Option A: Use Connection Pooling (Easiest)

1. Supabase Dashboard → Settings → Database
2. Copy **Transaction mode** connection string
3. URL-encode password if needed (`@` → `%40`)
4. Update `DATABASE_URL` in Vercel
5. Redeploy

### Option B: Check Direct Connection

1. Verify your Supabase project is active
2. Check if direct connections (port 5432) are allowed
3. Try the connection string with SSL: `?sslmode=require`
4. If still failing, switch to connection pooling

## Testing the Connection

After updating, test locally:

```bash
# Pull Vercel env vars
vercel env pull .env.local

# Test connection
npx prisma db pull
```

Or test with psql:
```bash
psql "postgresql://postgres:C%40B%40U%40R%40A%40N@db.tngzqalzwrtlazlzooou.supabase.co:5432/postgres?sslmode=require"
```

## Common Issues

### "Can't reach database server"
- **Cause**: Firewall blocking Vercel IPs
- **Fix**: Use connection pooling (port 6543)

### "SSL connection required"
- **Cause**: Missing SSL parameter
- **Fix**: Add `?sslmode=require` to URL

### "Connection timeout"
- **Cause**: Wrong hostname or port
- **Fix**: Use connection pooling URL from Supabase dashboard

### "Authentication failed"
- **Cause**: Wrong password or encoding
- **Fix**: Double-check password encoding (`@` → `%40`)

## Recommended Configuration

For Vercel + Supabase, use:

```
DATABASE_URL=postgresql://postgres.[project-ref]:[encoded-password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
```

Where:
- `[project-ref]` = Your Supabase project reference
- `[encoded-password]` = Your password with special chars encoded
- `[region]` = Your Supabase region (e.g., `ap-south-1`)

## Next Steps

1. ✅ Get connection pooling URL from Supabase
2. ✅ Update DATABASE_URL in Vercel
3. ✅ Redeploy
4. ✅ Test login endpoint

The connection pooling URL is the most reliable solution for Vercel deployments!
