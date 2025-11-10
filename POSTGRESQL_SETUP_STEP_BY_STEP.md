# PostgreSQL Setup on Render - Step-by-Step Guide

## 🎯 Goal
Set up PostgreSQL database on Render and connect it to your web application so your data persists across deployments.

---

## Step 1: Create PostgreSQL Database on Render

### 1.1 Go to Render Dashboard
1. Log in to your Render account at [https://dashboard.render.com](https://dashboard.render.com)
2. You should see your dashboard with your existing services

### 1.2 Create New PostgreSQL Database
1. Click the **"New +"** button in the top right corner of the dashboard
2. From the dropdown menu, select **"PostgreSQL"**

### 1.3 Configure Database Settings
Fill in the following information:

- **Name**: `schools-ranking-db` (or any name you prefer)
  - This is just a label for your reference
  
- **Database**: `schools_ranking` (or leave default)
  - This is the actual database name
  
- **User**: Leave default (Render will create one automatically)
  - Or create a custom username if you prefer
  
- **Region**: 
  - **IMPORTANT**: Choose the **SAME region** as your web service
  - This ensures fast connection between your app and database
  - To check your web service region: Go to your web service → Settings → Region

- **PostgreSQL Version**: Leave default (usually latest version)

- **Plan**: 
  - Start with **"Starter"** (Free tier available)
  - You can upgrade later if needed

### 1.4 Create the Database
1. Click the **"Create Database"** button
2. Wait 1-2 minutes for Render to provision your database
3. You'll see a green status indicator when it's ready

---

## Step 2: Get Database Connection String

### 2.1 Open Database Dashboard
1. Once your database is ready, click on its name in the dashboard
2. You'll see the database details page

### 2.2 Find Connection Information
Look for the **"Connections"** section on the database page. You'll see:

- **Internal Database URL** ← **USE THIS ONE!**
  - Format: `postgresql://user:password@hostname:5432/database_name`
  - This is for services in the same region (faster and free)
  
- **External Database URL** (ignore this - only for external connections)

### 2.3 Copy the Internal Database URL
1. Click the **"Copy"** button next to **"Internal Database URL"**
2. **Save this somewhere safe** - you'll need it in the next step
3. It looks something like:
   ```
   postgresql://schools_ranking_user:abc123xyz@dpg-xxxxx-a.singapore-postgres.render.com:5432/schools_ranking_xxxx
   ```

---

## Step 3: Add DATABASE_URL to Your Web Service

### 3.1 Go to Your Web Service
1. Go back to your Render dashboard
2. Click on your **web service** (the one running your schools-ranking app)
3. It should be named something like `schools-ranking-app` or similar

### 3.2 Open Environment Tab
1. In your web service dashboard, look for tabs at the top
2. Click on the **"Environment"** tab

### 3.3 Add DATABASE_URL Variable
1. In the **"Environment Variables"** section, click the **"+ Add"** button
2. A form will appear with two fields:
   
   **Key**: Type exactly: `DATABASE_URL`
   - Case-sensitive, must be exactly as shown
   
   **Value**: Paste the Internal Database URL you copied in Step 2.3
   - It should start with `postgresql://`
   
3. Click **"Save Changes"** or **"Add"** button

### 3.4 Verify the Variable
1. You should now see `DATABASE_URL` in your environment variables list
2. The value will be hidden (shown as dots) for security - this is normal

---

## Step 4: Deploy and Verify

### 4.1 Trigger Deployment (if needed)
1. Render will automatically detect the new environment variable
2. If it doesn't auto-deploy, you can:
   - Go to your web service → "Manual Deploy" → "Deploy latest commit"
   - Or push a new commit to trigger deployment

### 4.2 Check Logs
1. Go to your web service → **"Logs"** tab
2. Look for these messages (should appear after deployment):
   ```
   ✅ PostgreSQL database connected successfully
   ✅ Using PostgreSQL database (data will persist across deployments)
   ✅ Database tables and indexes created successfully
   ```
3. If you see these messages, **PostgreSQL is working!** 🎉

### 4.3 Test the Application
1. Go to your application URL
2. Submit a tutor request (test data)
3. Check the admin panel - the data should appear
4. Restart your service - the data should still be there!

---

## Step 5: Verify Data Persistence

### 5.1 Test Data Persistence
1. Submit some test data (tutor request or teacher)
2. Go to Render dashboard → Your web service → **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait for deployment to complete
4. Check your admin panel again
5. **Your data should still be there!** ✅

---

## Troubleshooting

### Problem: "PostgreSQL connection failed"
**Solution:**
- Verify `DATABASE_URL` is set correctly
- Check that both services are in the same region
- Ensure database status is "Available" (green)

### Problem: "Table already exists" errors
**Solution:**
- This is normal on first run - tables are being created
- Check logs for "Database tables created successfully"

### Problem: Still using SQLite
**Solution:**
- Verify `DATABASE_URL` environment variable is set
- Check that the value starts with `postgresql://`
- Restart your service after adding the variable

### Problem: Can't find "Internal Database URL"
**Solution:**
- Make sure you're looking at the PostgreSQL database page (not web service)
- Scroll down to find the "Connections" section
- If you only see "External Database URL", your database might be in a different region

---

## Important Notes

✅ **Use Internal Database URL** - It's faster and free for same-region connections  
✅ **Same Region** - Database and web service must be in the same region  
✅ **Keep Connection String Secret** - Never commit it to Git  
✅ **Automatic Backups** - Render manages PostgreSQL backups automatically  
✅ **No Manual Backups Needed** - Unlike SQLite, PostgreSQL backups are automatic  

---

## Success Checklist

- [ ] PostgreSQL database created on Render
- [ ] Database status is "Available" (green)
- [ ] Internal Database URL copied
- [ ] `DATABASE_URL` environment variable added to web service
- [ ] Service redeployed
- [ ] Logs show "PostgreSQL database connected successfully"
- [ ] Test data persists after deployment

---

## Need Help?

If you encounter any issues:
1. Check the logs in your Render dashboard
2. Verify the `DATABASE_URL` format is correct
3. Ensure both services are in the same region
4. Check that the database status is "Available"

Once you complete these steps, your data will be permanently stored and will never be lost during deployments! 🎉

