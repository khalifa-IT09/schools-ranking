# PostgreSQL Setup Guide for Render

> **📖 For detailed step-by-step instructions with screenshots, see `POSTGRESQL_SETUP_STEP_BY_STEP.md`**

## Quick Reference

### Step 1: Create PostgreSQL Database on Render

1. **Go to Render Dashboard**
   - Log in to your Render account
   - Click **"New +"** button in the top right
   - Select **"PostgreSQL"**

2. **Configure Database**
   - **Name:** `schools-ranking-db` (or any name you prefer)
   - **Database:** `schools_ranking` (or leave default)
   - **User:** Leave default (or create custom)
   - **Region:** Choose closest to your web service
   - **Plan:** Start with **Starter** (free tier available)
   - Click **"Create Database"**

3. **Wait for Database to be Ready**
   - Render will provision your database (takes 1-2 minutes)
   - You'll see a green status when ready

### Step 2: Get Database Connection String

1. **In your PostgreSQL database dashboard:**
   - Click on your database name
   - Find the **"Connections"** section
   - Copy the **"Internal Database URL"** (for same-region services)
   - It looks like: `postgresql://user:password@hostname:5432/database_name`

### Step 3: Add Environment Variables to Your Web Service

1. **Go to your Web Service** (schools-ranking-app)
2. **Click "Environment"** tab
3. **Add these environment variables:**

   **Variable 1:**
   - **Key:** `DATABASE_URL`
   - **Value:** Paste the Internal Database URL you copied
   - **Click "Save Changes"**

   **Variable 2 (Optional - for local development):**
   - **Key:** `USE_POSTGRESQL`
   - **Value:** `true`
   - This tells the app to use PostgreSQL instead of SQLite

### Step 4: Deploy the Updated Code

1. **The code will automatically:**
   - Detect PostgreSQL connection string
   - Create all necessary tables
   - Migrate data structure
   - Start using PostgreSQL for all operations

### Step 5: Verify It's Working

1. **Check Logs:**
   - Go to your web service → **"Logs"** tab
   - Look for: `✅ Using PostgreSQL database`
   - Look for: `✅ Database tables created successfully`

2. **Test the Application:**
   - Submit a tutor request
   - Check admin panel - data should persist
   - Restart the service - data should still be there

## Migration from SQLite to PostgreSQL

If you have existing SQLite data:

1. **Export data from SQLite** (if you have access to the old database)
2. **Import to PostgreSQL** using the migration script
3. **Or start fresh** - the app will create empty tables automatically

## Troubleshooting

### Connection Issues
- Make sure you're using **Internal Database URL** (not External)
- Ensure both services are in the **same region**
- Check that database status is **"Available"**

### Table Creation Issues
- Check logs for specific error messages
- Ensure database user has CREATE TABLE permissions
- Verify DATABASE_URL is correct

### Data Not Persisting
- Verify DATABASE_URL environment variable is set
- Check that USE_POSTGRESQL is set to `true` (or DATABASE_URL is present)
- Review logs for database connection errors

## Benefits of PostgreSQL

✅ **Data persists across deployments**  
✅ **Automatic backups** (Render manages this)  
✅ **Better performance** for concurrent users  
✅ **Scalable** - can handle more data  
✅ **Production-ready** solution

