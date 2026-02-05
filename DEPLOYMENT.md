# Vercel Deployment Guide

This guide will help you deploy the 3stories Restaurant Billing System to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. A Supabase PostgreSQL database (or any PostgreSQL database)
3. Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Push to Git Repository

Make sure your code is pushed to a Git repository:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? Select your account
- Link to existing project? **No**
- Project name? `3stories-restaurant-billing` (or your preferred name)
- Directory? `./` (current directory)
- Override settings? **No**

4. For production deployment:
```bash
vercel --prod
```

### Option B: Using Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure the project:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `prisma generate && next build`
   - Output Directory: `.next` (default)
   - Install Command: `npm install`

## Step 3: Configure Environment Variables

In your Vercel project dashboard, go to **Settings → Environment Variables** and add:

### Required Variables:

```
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_ACCESS_SECRET=your-super-secret-access-key-min-10-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-10-chars
APP_BASE_URL=https://your-project.vercel.app
```

### Optional Variables (with defaults):

```
JWT_ACCESS_TTL_SECONDS=28800
JWT_REFRESH_TTL_SECONDS=1209600
INVOICE_STORAGE_DRIVER=local
LOCAL_INVOICE_DIR=./storage/invoices
```

### Generate Secure Secrets:

For JWT secrets, generate strong random strings:

```bash
# On Linux/Mac:
openssl rand -base64 32

# Or use Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Step 4: Run Database Migrations

After deployment, you need to run Prisma migrations:

### Option A: Using Vercel CLI

```bash
vercel env pull .env.local
npx prisma migrate deploy
```

### Option B: Using Supabase CLI or Dashboard

Connect to your database and run the migrations manually, or use Supabase's migration tool.

### Option C: Add a Build Script

You can also add a postinstall script to run migrations automatically. Add to `package.json`:

```json
"scripts": {
  "postinstall": "prisma generate",
  "vercel-build": "prisma generate && prisma migrate deploy && next build"
}
```

Then update `vercel.json`:

```json
{
  "buildCommand": "npm run vercel-build"
}
```

## Step 5: Verify Deployment

1. Visit your Vercel deployment URL
2. Check the deployment logs for any errors
3. Test the application:
   - Register a new user
   - Create a restaurant
   - Test POS functionality
   - Test QR ordering

## Troubleshooting

### Build Fails

- Check that all environment variables are set
- Verify `DATABASE_URL` is correct
- Check build logs in Vercel dashboard

### Database Connection Issues

- Verify `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Check if your database allows connections from Vercel IPs
- For Supabase: Check connection pooling settings

### Prisma Issues

- Ensure `prisma generate` runs before build
- Check that migrations are applied
- Verify Prisma Client is generated

### Environment Variables Not Working

- Make sure variables are set for the correct environment (Production, Preview, Development)
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)

## Post-Deployment

1. **Seed Database** (optional):
   - Connect to your database
   - Run: `npm run seed` (or manually create initial data)

2. **Set Up Custom Domain** (optional):
   - Go to Vercel project settings
   - Add your custom domain
   - Update `APP_BASE_URL` environment variable

3. **Monitor**:
   - Check Vercel Analytics
   - Monitor error logs
   - Set up alerts

## Important Notes

- **Database**: Make sure your PostgreSQL database is accessible from Vercel's servers
- **File Storage**: For production, consider using S3 instead of local storage
- **Security**: Never commit `.env` files or secrets to Git
- **Backups**: Set up regular database backups

## Support

For issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify all environment variables are set correctly
4. Ensure database migrations are applied
