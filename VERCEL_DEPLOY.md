# Vercel Deployment - Quick Fix

## Issue: Database Connection During Build

The build is failing because Prisma tries to connect to the database during `prisma migrate deploy`. 

## Solution: Separate Migration Step

### Step 1: Update Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables and add:

```
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_ACCESS_SECRET=<your-secret>
JWT_REFRESH_SECRET=<your-secret>
APP_BASE_URL=https://your-project.vercel.app
```

**Important**: Make sure `DATABASE_URL` is set correctly and your Supabase database allows connections from Vercel's IPs.

### Step 2: Run Migrations Separately

After deployment, run migrations manually:

**Option A: Using Vercel CLI**
```bash
# Pull environment variables
vercel env pull .env.local

# Run migrations
npx prisma migrate deploy
```

**Option B: Using Supabase Dashboard**
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Run the migration SQL files from `prisma/migrations/` manually

**Option C: Add a Migration Script (Recommended)**

Create a script that runs migrations on first API call or use Vercel's Post-Deploy hook.

### Step 3: Redeploy

After setting environment variables, redeploy:

```bash
vercel --prod
```

## Alternative: Skip Migrations in Build

The build command has been updated to skip `prisma migrate deploy` during build. Migrations should be run separately after deployment.

## Verify Database Connection

1. Check Supabase connection settings:
   - Go to Project Settings → Database
   - Check "Connection Pooling" settings
   - Ensure "Allow connections from anywhere" or add Vercel IPs

2. Test connection:
```bash
# Test locally with Vercel env
vercel env pull .env.local
npx prisma migrate deploy
```

## Common Issues

### "Can't reach database server"
- Check DATABASE_URL format
- Verify database is running
- Check firewall/network settings
- For Supabase: Use connection pooling URL if available

### "Migration failed"
- Run migrations manually first
- Check database permissions
- Verify schema matches migrations

## Next Steps

1. ✅ Set all environment variables in Vercel
2. ✅ Deploy without migrations (build will succeed)
3. ✅ Run migrations manually after deployment
4. ✅ Test the application

The build should now succeed! 🎉
