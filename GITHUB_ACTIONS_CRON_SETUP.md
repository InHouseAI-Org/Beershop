# GitHub Actions Cron Job Setup for Prepaid Expense Amortization

This guide explains how to set up automatic daily amortization using GitHub Actions (100% FREE).

---

## ✅ What's Already Done

The GitHub Actions workflow file has been created at:
```
.github/workflows/daily-amortization.yml
```

This workflow will automatically run at **00:00 UTC (5:30 AM IST)** every day.

---

## 🔧 Setup Steps

### Step 1: Add Repository Secret

You need to add your backend URL as a secret in your GitHub repository.

1. Go to your GitHub repository: `https://github.com/YOUR_USERNAME/YOUR_REPO`

2. Click **Settings** (top right)

3. In the left sidebar, click **Secrets and variables** → **Actions**

4. Click **New repository secret**

5. Add the following secret:
   - **Name**: `BACKEND_URL`
   - **Value**: Your Vercel backend URL (without trailing slash)
     - Example: `https://your-backend.vercel.app`
     - Or your production backend URL

6. Click **Add secret**

### Step 2: Push the Workflow File

Commit and push the workflow file to your repository:

```bash
cd /Users/manavbathija/Desktop/Beershop
git add .github/workflows/daily-amortization.yml
git commit -m "feat: add GitHub Actions cron job for daily prepaid expense amortization"
git push
```

### Step 3: Verify Setup

1. Go to your GitHub repository

2. Click the **Actions** tab

3. You should see "Daily Prepaid Expense Amortization" in the workflows list

4. **Test it manually** (don't wait for midnight):
   - Click on "Daily Prepaid Expense Amortization"
   - Click **Run workflow** dropdown (right side)
   - Click the green **Run workflow** button
   - Wait a few seconds and refresh - you'll see the workflow running

5. Click on the running workflow to see logs and verify it worked

---

## 📅 Schedule Details

- **Runs**: Every day at 00:00 UTC (5:30 AM IST)
- **Cron Expression**: `0 0 * * *`
- **Cost**: 100% FREE (GitHub Actions provides 2,000 minutes/month for free)

### Want to Change the Time?

Edit `.github/workflows/daily-amortization.yml` and change the cron expression:

```yaml
schedule:
  - cron: '0 0 * * *'  # Change this line
```

**Common times:**
- `0 0 * * *` - Midnight UTC (5:30 AM IST)
- `30 18 * * *` - 6:30 PM UTC (12:00 AM IST midnight)
- `0 12 * * *` - 12:00 PM UTC (5:30 PM IST)

Use [crontab.guru](https://crontab.guru/) to create custom schedules.

---

## 🧪 Manual Testing

You can trigger the workflow manually anytime:

1. Go to **Actions** tab in GitHub
2. Select "Daily Prepaid Expense Amortization"
3. Click **Run workflow**
4. Select the branch (usually `main`)
5. Click **Run workflow**

This is useful for testing without waiting for the scheduled time.

---

## 🔍 Monitoring

### View Logs

1. Go to **Actions** tab
2. Click on any workflow run
3. Click on the "amortize" job
4. Expand "Run Amortization" to see detailed logs

### Check if it Ran

- GitHub will show green ✅ if successful
- Red ❌ if failed
- You'll see the HTTP response and amortization summary in logs

---

## 🚨 Troubleshooting

### Workflow doesn't appear in Actions tab

**Cause**: Workflow file not pushed to `main` branch

**Solution**:
```bash
git push origin main
```

### HTTP 404 Error

**Cause**: `BACKEND_URL` secret is incorrect

**Solution**:
1. Go to Settings → Secrets and variables → Actions
2. Edit `BACKEND_URL` secret
3. Make sure it's your correct production backend URL (no trailing slash)

### HTTP 500 Error

**Cause**: Backend error (database connection, etc.)

**Solution**:
1. Check your backend logs on Vercel
2. Test the endpoint manually with curl:
```bash
curl -X POST https://your-backend.vercel.app/api/prepaid-expenses/amortize/daily
```

### Workflow doesn't run at scheduled time

**Cause**: GitHub Actions can have delays during high load (up to 15-30 minutes)

**Solution**: This is normal. If it's consistently delayed, consider:
1. Using a different time (less popular times run faster)
2. Using an external service like EasyCron

---

## 🎯 How It Works

1. **GitHub Actions** triggers at midnight UTC
2. Makes a **POST request** to your backend: `/api/prepaid-expenses/amortize/daily`
3. Your backend:
   - Finds all prepaid expenses where `next_amortization_date <= today`
   - Amortizes them by one period
   - Updates `remaining_value` and `next_amortization_date`
4. Returns success/failure response
5. GitHub logs the result

---

## 💰 Cost

**Completely FREE!**

- GitHub Actions provides 2,000 free minutes/month
- This workflow takes ~10-30 seconds per run
- Running daily = 30 runs/month = ~15 minutes total
- You'll use less than 1% of your free quota

---

## 🔐 Security

The amortization endpoint (`/api/prepaid-expenses/amortize/daily`) is:
- ✅ Publicly accessible (no auth required)
- ⚠️ **Should only run automated tasks** (doesn't expose sensitive data)
- ✅ Safe because it only performs scheduled database operations

If you want to add authentication, you can:
1. Create an API key in your backend
2. Add it as a GitHub secret (`CRON_API_KEY`)
3. Send it in the request header
4. Validate it in your controller

---

## ✅ Next Steps

1. Add `BACKEND_URL` secret to GitHub
2. Push the workflow file
3. Test manually via Actions tab
4. Wait for midnight to see automatic run
5. Check logs to confirm success

---

**Setup Date**: March 17, 2026
**Created by**: Claude Code
