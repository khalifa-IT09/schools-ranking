# Render Deployment - Persistent Data Storage Guide

## ⚠️ CRITICAL: Preventing Data Loss on Render

### The Problem
By default, Render uses an **ephemeral filesystem** that gets wiped on every deployment. This means:
- Database files in the project directory are **deleted** on each deploy
- Student requests and professor data are **lost** unless stored persistently

### The Solution

#### Option 1: Use Render Persistent Disk (Recommended)
1. In your Render dashboard, go to your service settings
2. Add a **Persistent Disk** (if available on your plan)
3. Set the mount path (e.g., `/opt/render/project/data`)
4. Add environment variable:
   - **Name:** `DATA_DIR`
   - **Value:** `/opt/render/project/data`

#### Option 2: Use External Database (Best Practice)
For production, consider using:
- **PostgreSQL** (Render provides managed PostgreSQL)
- **SQLite on persistent disk** (current setup)

### Current Configuration
The app is configured to use:
- Default: `./data/` (ephemeral - gets wiped on deploy)
- With DATA_DIR: Uses the environment variable path (persistent)

### Immediate Action Required
1. **Set DATA_DIR environment variable** in Render dashboard
2. **Add a Persistent Disk** to your Render service
3. **Restore from backup** if available (check `/api/backups` endpoint)

### Backup Location
- Backups are stored in: `{DATA_DIR}/backups/`
- Automatic backups run every 6 hours
- Last 10 backups are kept automatically

### Restoring Data
If you have backups, you can restore via:
- API endpoint: `POST /api/restore` with `{ "backupPath": "/path/to/backup.db" }`
- Or manually copy backup file to database location

