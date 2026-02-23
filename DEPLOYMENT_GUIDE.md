# 🚀 Beershop Deployment Guide for Vercel

## 📋 Prerequisites Checklist

- [ ] GitHub account
- [ ] Vercel account (sign up at vercel.com)
- [ ] PostgreSQL database (see options below)

---

## 1️⃣ **GET DATABASE CREDENTIALS**

### **Option A: Neon (Recommended - Easiest)**

1. Go to https://neon.tech
2. Sign up / Login
3. Click "Create Project"
4. Name: `beershop`
5. Click "Create"
6. **Copy the connection string** - it looks like:
   ```
   postgresql://username:password@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require
   ```

### **Option B: Supabase**

1. Go to https://supabase.com
2. Create new project named `beershop`
3. Set a database password (SAVE IT!)
4. Go to Settings → Database → Connection Info
5. **Copy connection details**

### **Option C: Railway**

1. Go to https://railway.app
2. New Project → Provision PostgreSQL
3. Click database → Variables tab
4. **Copy connection details**

---

## 2️⃣ **SETUP DATABASE TABLES**

### **Step 1: Run Migration Script**

1. Go to your database provider's **SQL Editor**:
   - **Neon**: Dashboard → SQL Editor
   - **Supabase**: SQL Editor (in sidebar)
   - **Railway**: Database → Data tab → Query

2. **Copy the ENTIRE content** from:
   ```
   backend/src/config/production_setup.sql
   ```

3. **Paste and Execute** in the SQL Editor

4. You should see: "Success" or "Commands executed"

---

## 3️⃣ **DEPLOY BACKEND TO VERCEL**

### **Step 1: Push to GitHub (if not already)**

```bash
cd /Users/manavbathija/Desktop/Beershop
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/beershop.git
git push -u origin main
```

### **Step 2: Connect to Vercel**

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. **Root Directory**: `backend`
4. **Framework Preset**: Other
5. Click "Deploy"

### **Step 3: Add Environment Variables**

After deployment, go to:
**Project Settings → Environment Variables**

Add these variables:

#### **If using DATABASE_URL (Neon/Railway):**
```bash
NODE_ENV=production
PORT=5001
JWT_SECRET=<generate-with-command-below>
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
```

#### **If using individual variables (Supabase):**
```bash
NODE_ENV=production
PORT=5001
JWT_SECRET=<generate-with-command-below>
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=postgres
```

**Generate JWT_SECRET:**
```bash
# Run in terminal:
openssl rand -base64 32
# Copy the output
```

### **Step 4: Redeploy**

Click "Redeploy" button after adding environment variables

### **Step 5: Note Your Backend URL**

Copy the URL (e.g., `https://beershop-backend.vercel.app`)

---

## 4️⃣ **DEPLOY FRONTEND TO VERCEL**

### **Step 1: Connect to Vercel**

1. Go to https://vercel.com/new
2. Import **SAME** GitHub repository
3. **Root Directory**: `frontend`
4. **Framework Preset**: Create React App
5. **Build Command**: `npm run build`
6. **Output Directory**: `build`
7. **Install Command**: `npm install`

### **Step 2: Add Environment Variables**

Before deploying, add this variable:

```bash
REACT_APP_API_URL=https://your-backend-url.vercel.app/api
```

**Replace** `your-backend-url.vercel.app` with your actual backend URL from Step 3

### **Step 3: Deploy**

Click "Deploy"

---

## 5️⃣ **UPDATE BACKEND CORS**

After frontend deploys, you need to allow it in backend:

1. Note your frontend URL (e.g., `https://beershop.vercel.app`)

2. Add to backend environment variables:
   ```bash
   FRONTEND_URL=https://beershop.vercel.app
   ```

3. Update `backend/src/server.js`:
   ```javascript
   const cors = require('cors');

   app.use(cors({
     origin: process.env.FRONTEND_URL || 'http://localhost:3000',
     credentials: true
   }));
   ```

4. Commit and push changes - Vercel will auto-deploy

---

## 6️⃣ **CREATE SUPER ADMIN**

### **Option A: Using SQL Editor**

Run this in your database SQL editor:

```sql
INSERT INTO super_admins (username, password)
VALUES (
  'admin',
  '$2a$10$YourHashedPasswordHere'
);
```

To hash password:
```bash
# Run in terminal:
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
```

### **Option B: Using API (after deployment)**

```bash
curl -X POST https://your-backend-url.vercel.app/api/auth/super-admin/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}'
```

---

## ✅ **FINAL CHECKLIST**

- [ ] Database created and accessible
- [ ] Migration script executed successfully
- [ ] Backend deployed to Vercel
- [ ] Backend environment variables set
- [ ] Frontend deployed to Vercel
- [ ] Frontend `REACT_APP_API_URL` points to backend
- [ ] CORS configured with frontend URL
- [ ] Super admin created
- [ ] Can login at frontend URL
- [ ] Test creating organisation, admin, user
- [ ] Test creating products and sales

---

## 🆘 **TROUBLESHOOTING**

### **"Cannot connect to database"**
- Check DATABASE_URL is correct
- Ensure `sslmode=require` is in connection string
- Verify database is accessible from internet

### **"CORS Error"**
- Add frontend URL to FRONTEND_URL env variable
- Make sure CORS is configured in backend
- Redeploy backend after changes

### **"Login not working"**
- Check JWT_SECRET is set
- Verify super admin was created
- Check browser console for errors

### **"API calls failing"**
- Verify REACT_APP_API_URL is correct
- Should end with `/api`
- Check backend logs in Vercel dashboard

---

## 📞 **Need Help?**

Check Vercel logs:
1. Go to project in Vercel
2. Click "Deployments"
3. Click on latest deployment
4. Click "Functions" → Select function → View logs

Check database connections:
1. Use your provider's connection test feature
2. Try connecting with a database client (e.g., DBeaver, TablePlus)

---

## 🎉 **You're Done!**

Your app should now be live at:
- **Frontend**: https://your-frontend.vercel.app
- **Backend**: https://your-backend.vercel.app

Login with your super admin credentials and start using the app!
