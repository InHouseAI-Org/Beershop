# Vercel Deployment Guide for Beershop Backend

## Critical: Environment Variables Configuration

The authentication failures you're experiencing are likely due to missing environment variables in your Vercel deployment.

### Required Environment Variables

You **MUST** configure these environment variables in your Vercel project:

1. Go to your Vercel project: https://vercel.com/dashboard
2. Select your project (beershopbackend)
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

#### Database Configuration (Neon PostgreSQL)
```
DB_HOST=your-neon-hostname.neon.tech
DB_PORT=5432
DB_USER=your-neon-username
DB_PASSWORD=your-neon-password
DB_NAME=your-database-name
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

#### Authentication Configuration
```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=production
```

**IMPORTANT**:
- The `JWT_SECRET` MUST be the same value as in your local `.env` file
- Use a strong, random secret in production (recommended: at least 32 characters)
- After adding environment variables, you must **redeploy** your backend

### How to Get Your Neon Database Credentials

1. Log into your Neon dashboard: https://console.neon.tech
2. Select your project
3. Go to "Connection Details"
4. Copy the connection string or individual credentials
5. Add them to Vercel environment variables

### Common Issues & Solutions

#### Issue 1: "Invalid credentials" even with correct password
**Cause**: JWT_SECRET not set in Vercel
**Solution**: Add JWT_SECRET environment variable and redeploy

#### Issue 2: "Server error" during login
**Cause**: Database connection failed
**Solution**: Verify DB_HOST, DB_USER, DB_PASSWORD, DB_NAME are correctly set

#### Issue 3: Username with trailing spaces (e.g., "Santosh ")
**Cause**: Database has usernames with spaces
**Solution**: This is now handled automatically by the updated code (trim functionality)

### Verifying Environment Variables

After setting environment variables:

1. Redeploy your backend (Vercel dashboard → Deployments → Redeploy)
2. Check the deployment logs for any errors
3. Test login with a known user (e.g., admin/admin)

### Testing Locally vs Production

**Local (.env file)**:
- Uses `backend/.env` file
- Database: Local PostgreSQL or Neon
- JWT_SECRET from .env

**Production (Vercel)**:
- Uses Vercel Environment Variables
- Database: Neon PostgreSQL (cloud)
- JWT_SECRET from Vercel settings

### Database Migration on Neon

If you haven't run the migration on Neon yet:

1. Connect to your Neon database using the connection string
2. Run the migration SQL file: `NEON_FINAL_MIGRATION_WITH_YOUR_DATA.sql`
3. Verify tables and data are created correctly

### Debug Checklist

- [ ] JWT_SECRET is set in Vercel environment variables
- [ ] Database credentials are correct in Vercel
- [ ] Backend has been redeployed after adding environment variables
- [ ] Database migration has been run on Neon
- [ ] Can connect to Neon database from local machine
- [ ] Vercel deployment logs show no errors
- [ ] Test with superadmin credentials: username=admin, password=admin

### Security Notes

⚠️ **IMPORTANT SECURITY**:
- Never commit `.env` files to Git
- Use strong, unique JWT_SECRET in production
- Use strong database passwords
- Enable SSL for database connections
- Rotate secrets regularly

### Support

If you continue to experience issues:
1. Check Vercel deployment logs (Functions → Latest deployment → View logs)
2. Enable detailed logging temporarily by adding `DEBUG=*` to environment variables
3. Test the API endpoint directly: `https://beershopbackend.vercel.app/api/auth/login`
