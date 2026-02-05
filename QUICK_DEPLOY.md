# Quick Vercel Deployment

## Fast Track (5 minutes)

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login
```bash
vercel login
```

### 3. Deploy
```bash
vercel
```

When prompted:
- Set up and deploy? **Yes**
- Link to existing project? **No** (first time)
- Project name? `3stories-billing` (or your choice)
- Directory? `./`
- Override settings? **No**

### 4. Set Environment Variables

After first deployment, set these in Vercel Dashboard → Settings → Environment Variables:

```bash
# Required
DATABASE_URL=postgresql://postgres:C%40B%40U%40R%40A%40N@db.tngzqalzwrtlazlzooou.supabase.co:5432/postgres
JWT_ACCESS_SECRET=<generate-random-32-chars>
JWT_REFRESH_SECRET=<generate-random-32-chars>
APP_BASE_URL=https://your-project.vercel.app

# Optional (defaults provided)
JWT_ACCESS_TTL_SECONDS=28800
JWT_REFRESH_TTL_SECONDS=1209600
```

**Important**: 
- If your password contains special characters like `@`, `#`, `$`, etc., you MUST URL-encode them
- `@` becomes `%40`, `#` becomes `%23`, etc.
- See `FIX_DATABASE_URL.md` for detailed instructions

**Generate secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 5. Set Environment Variables in Vercel Dashboard

Go to **Settings → Environment Variables** and add:

```
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_ACCESS_SECRET=<generate-random-32-chars>
JWT_REFRESH_SECRET=<generate-random-32-chars>
APP_BASE_URL=https://your-project.vercel.app
```

**Important**: Make sure your Supabase database allows connections from Vercel.

### 6. Run Migrations (After First Deployment)

```bash
# Pull env vars
vercel env pull .env.local

# Run migrations
npx prisma migrate deploy
```

**Note**: Migrations are NOT run during build. Run them manually after deployment.

### 6. Deploy to Production

```bash
vercel --prod
```

## That's it! 🎉

Your app should now be live at: `https://your-project.vercel.app`

## Troubleshooting

- **Build fails?** Check environment variables are set
- **Database error?** Verify DATABASE_URL is correct
- **Can't connect?** Check database allows Vercel IPs

For detailed instructions, see `DEPLOYMENT.md`
