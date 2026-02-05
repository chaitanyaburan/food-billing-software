# Fix DATABASE_URL in Vercel

## Problem

Your DATABASE_URL has a password with `@` symbols that need to be URL-encoded. The error shows:
```
Can't reach database server at `Ndb.tngzqalzwrtlazlzooou.supab
```

This means the URL parser is treating part of your password as the hostname.

## Solution

### Step 1: URL-Encode Your Password

Your password is: `C@B@U@R@A@N`

Each `@` symbol needs to be encoded as `%40`

**Encoded password**: `C%40B%40U%40R%40A%40N`

### Step 2: Update DATABASE_URL in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings → Environment Variables**
3. Find `DATABASE_URL` and click **Edit**
4. Replace it with:

```
postgresql://postgres:C%40B%40U%40R%40A%40N@db.tngzqalzwrtlazlzooou.supabase.co:5432/postgres
```

**Important**: 
- Make sure the hostname is `db.tngzqalzwrtlazlzooou.supabase.co` (not `Ndb...`)
- All `@` symbols in the password are encoded as `%40`
- The format is: `postgresql://username:encoded_password@host:port/database`

### Step 3: Verify the URL Format

The correct format should be:
```
postgresql://[username]:[encoded_password]@[host]:[port]/[database]
```

Where:
- `username` = `postgres`
- `encoded_password` = `C%40B%40U%40R%40A%40N` (your password with @ encoded)
- `host` = `db.tngzqalzwrtlazlzooou.supabase.co`
- `port` = `5432`
- `database` = `postgres`

### Step 4: Test the Connection

After updating, the connection should work. The API should now be able to connect to your Supabase database.

## Quick URL Encoding Reference

If you need to encode other special characters:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`
- `?` → `%3F`
- `/` → `%2F`
- `:` → `%3A`

## Alternative: Use Supabase Connection Pooling (RECOMMENDED)

**This is the BEST solution for Vercel deployments!**

Supabase provides connection pooling URLs specifically for serverless environments. These are more reliable than direct connections.

### Steps:

1. Go to **Supabase Dashboard → Project Settings → Database**
2. Find **Connection Pooling** section
3. Copy the **Transaction mode** connection string
   - It uses port **6543** (not 5432)
   - Format: `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres`
4. Update `DATABASE_URL` in Vercel with this URL
5. Still need to URL-encode password if it has special characters

**Why use connection pooling?**
- ✅ Optimized for serverless (Vercel)
- ✅ Handles many concurrent connections
- ✅ More reliable than direct connections
- ✅ Better performance

**See `FIX_SUPABASE_CONNECTION.md` for detailed instructions.**

## Verify It Works

After updating, test by:
1. Making a login request to `/api/auth/login`
2. Check Vercel logs - should no longer show connection errors
3. The app should now connect to the database successfully
