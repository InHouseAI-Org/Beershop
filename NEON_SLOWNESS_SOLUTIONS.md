# 🐌 Neon Database Still Slow - Advanced Troubleshooting

## Current Status
After adding indexes, queries are still taking 1.5-3 seconds with 100% DB time.

---

## Most Likely Causes (in order)

### 1. **Neon Free Tier Auto-Suspend (MOST LIKELY)**

**Problem**: Neon Free tier automatically suspends your database after 5 minutes of inactivity. When a query comes in, it takes **2-3 seconds to wake up**.

**How to check**:
- Go to Neon Dashboard → Project Settings → Compute
- Look for "Auto-suspend delay" setting
- If it says "5 minutes" → **This is your problem!**

**Solutions**:

#### Option A: Keep Database Awake (Free Tier Hack)
Create a cron job to ping your database every 4 minutes:

1. Go to https://cron-job.org (free service)
2. Create a job that hits your API every 4 minutes: `GET https://beershopbackend.vercel.app/api/health`
3. This prevents auto-suspend

**Pros**: Free
**Cons**: Hacky, uses your Neon free tier hours faster

#### Option B: Upgrade to Neon Launch Plan ($19/mo)
- No auto-suspend
- 0.5 vCPU (2x faster than free tier)
- 2 GB RAM (2x more than free tier)
- **Expected improvement**: 80-90% faster

---

### 2. **Neon Region Mismatch**

**Check this**:
1. **Neon Dashboard** → Settings → General → Check "Region"
2. **Vercel Dashboard** → Your Project → Settings → General → Check "Region"
3. **They MUST match!**

**Example**:
- ✅ Both `us-east-1` → Fast (<100ms latency)
- ❌ Neon: `eu-central-1`, Vercel: `us-east-1` → Slow (+200-300ms latency)

**Fix**: Migrate Neon database to match Vercel region
- Neon Dashboard → Project Settings → General → "Change region"

---

### 3. **Poor Neon Free Tier Performance**

**Free Tier Limits**:
- 0.25 vCPU (very weak!)
- 1 GB RAM
- Shared resources with other users
- Queries can be slow during peak hours

**Solutions**:
- Upgrade to Launch tier ($19/mo) for dedicated resources
- Or migrate to a different database provider

---

### 4. **Missing Connection Pooling on Neon Side**

**Problem**: You might not be using Neon's connection pooler

**Check your DATABASE_URL**:
```bash
# In Vercel, check your DATABASE_URL environment variable
# Should look like ONE of these:

# ❌ Direct connection (slow)
postgres://user:pass@ep-xxx.region.aws.neon.tech/db

# ✅ Pooled connection (faster)
postgres://user:pass@ep-xxx-pooler.region.aws.neon.tech/db
#                      ^^^^^^^^ Notice "-pooler"
```

**Fix**:
1. Go to Neon Dashboard → Connection Details
2. Select "Pooled connection"
3. Copy the new DATABASE_URL
4. Update in Vercel: Settings → Environment Variables → DATABASE_URL
5. Redeploy

---

## Diagnostic Steps

### Step 1: Run Diagnostic SQL
Run `diagnose_neon_performance.sql` in Neon SQL Editor to check:
- If indexes are being used
- Table sizes
- Sequential scans vs index scans

### Step 2: Check Neon Metrics
1. Go to Neon Dashboard → Monitoring
2. Look at "Query Duration" graph
3. If you see spikes every 5-10 minutes → **Auto-suspend issue**

### Step 3: Test Database Direct
Run this query directly in Neon SQL Editor and time it:
```sql
SELECT * FROM sales WHERE organisation_id = 'your-org-id';
```

- If fast in Neon (<100ms) but slow from Vercel (>1s) → **Network/region issue**
- If slow in Neon (>1s) → **Neon performance issue**

---

## Quick Win: Check These Now

1. **Is your DATABASE_URL using connection pooler?**
   - In Vercel → Settings → Environment Variables → DATABASE_URL
   - Should contain `-pooler` in the hostname

2. **What's your Neon tier?**
   - Neon Dashboard → Billing
   - If "Free" → Upgrade to Launch ($19/mo)

3. **Check Neon and Vercel regions**
   - They MUST be the same

4. **Check auto-suspend setting**
   - Neon Dashboard → Settings → Compute
   - If enabled → This is causing 2-3s delays

---

## Expected Performance by Tier

| Neon Tier | Cold Start | Query Time | Monthly Cost |
|-----------|------------|------------|--------------|
| **Free** | 2-3s | 500-2000ms | $0 |
| **Launch** | None | 50-300ms | $19 |
| **Scale** | None | 20-100ms | $69+ |

---

## Alternative: Migrate to Different Database

If you don't want to pay for Neon, consider:
- **Supabase** (Free tier with better performance)
- **Railway** ($5/mo, no cold starts)
- **Render** (Free tier, slower but no cold starts)
- **PlanetScale** (Free tier, MySQL instead of Postgres)

---

## Action Plan

1. **Immediate**: Check if using Neon pooled connection
2. **Immediate**: Verify Neon & Vercel regions match
3. **Short-term**: Set up cron job to prevent auto-suspend (free)
4. **Long-term**: Upgrade to Neon Launch tier ($19/mo)

---

**Share your answers to these questions and I'll give you the exact fix:**
1. What does your DATABASE_URL look like? (remove password)
2. What region is Neon in?
3. What region is Vercel in?
4. What's your Neon tier? (Free/Launch/Scale)
5. Run `diagnose_neon_performance.sql` and share results
