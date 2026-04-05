# 🚀 Performance Fix Guide - Neon Database Slowness

## 📊 Diagnosis Results

Your timing logs show **100% database bottleneck**:
```
GET /api/creditHolders - 1474ms (100% DB)
GET /api/products - 1794ms (100% DB)
GET /api/sales - 2873ms (100% DB)
```

**Root Cause**: Neon database queries are extremely slow (1.5-3 seconds each)

---

## 🔧 Solution Steps (In Priority Order)

### ✅ Step 1: Add Missing Indexes (CRITICAL - Do This First!)

**Action**: Run `verify_and_add_indexes.sql` in Neon SQL Editor

1. Go to Neon Dashboard → SQL Editor
2. Copy and paste the contents of `verify_and_add_indexes.sql`
3. Run the script
4. This will create all missing indexes on `organisation_id` columns

**Expected Impact**: 70-90% speed improvement (queries should drop from 2-3s to 200-500ms)

---

### ✅ Step 2: Deploy Connection Pool Optimizations

**What Changed**: Updated `backend/src/config/database.js` with:
- Connection pooling limits (max: 10, min: 0)
- Idle timeout (10s - closes unused connections)
- Query timeout (10s - prevents long-running queries)
- Connection timeout (5s - faster failure detection)

**Action**:
```bash
git add backend/src/config/database.js
git commit -m "perf: optimize database connection pool for Neon + Vercel serverless"
git push
```

**Expected Impact**: 10-20% improvement + prevents connection exhaustion

---

### ✅ Step 3: Check Neon Database Plan & Region

**Action**: Verify your Neon settings

1. **Check Database Region**:
   - Neon Dashboard → Settings → General
   - **Ensure region matches your Vercel deployment region**
   - Example: If Vercel is `us-east-1`, Neon should also be `us-east-1`
   - Cross-region latency can add 100-300ms per query

2. **Check Neon Compute Settings**:
   - Free tier: 0.25 vCPU, 1 GB RAM (SLOW!)
   - Paid tier: 0.5+ vCPU, 2+ GB RAM (MUCH FASTER)
   - **Consider upgrading if you have >100 sales records**

3. **Check Connection Limits**:
   - Free tier: 20 max connections
   - If you hit this limit, queries will queue/timeout

---

## 📈 After Applying Fixes

### How to Verify Improvements:

1. **Check Vercel Logs** for new timing data:
   ```
   Before: { totalTime: '2873ms', dbTime: '2872ms', dbPercentage: '100.0%' }
   After:  { totalTime: '450ms', dbTime: '400ms', dbPercentage: '89.0%' }
   ```

2. **Expected Performance**:
   - **With indexes**: 200-500ms per request
   - **With pooling**: 150-400ms per request
   - **Same region**: 100-300ms per request
   - **Paid Neon tier**: 50-200ms per request

---

## 🎯 Quick Win Checklist

- [ ] Run `verify_and_add_indexes.sql` in Neon SQL Editor
- [ ] Commit and push database pool optimizations
- [ ] Verify Neon region matches Vercel region
- [ ] Test app and check new timing logs
- [ ] Consider Neon paid tier if still slow (>500ms)

---

## 🔍 Additional Debugging

If still slow after indexes:

### Check Query Performance:
Run this in Neon SQL Editor to see slow queries:
```sql
SELECT
    query,
    calls,
    mean_exec_time,
    total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Enable pg_stat_statements:
```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

---

## 💰 Neon Pricing Tiers

| Tier | vCPU | RAM | Max Connections | Price |
|------|------|-----|----------------|-------|
| **Free** | 0.25 | 1 GB | 20 | $0 |
| **Launch** | 0.5 | 2 GB | 50 | $19/mo |
| **Scale** | 1-8 | 4-32 GB | 200-1000 | $69+/mo |

**Recommendation**: If you have production users, upgrade to Launch tier for 4-10x performance boost.

---

## 📞 Need Help?

If performance is still slow after these steps:
1. Share updated timing logs from Vercel
2. Run the query performance check above
3. Share your Neon tier and region settings
