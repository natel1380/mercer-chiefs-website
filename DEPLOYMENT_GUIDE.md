# Mercer Chiefs Hockey Club - Website & Autonomous Sync Deployment Guide

## 🏒 Overview
This repository contains the complete, modern production-ready website for the **Mercer Chiefs Hockey Club** (Official NCDC Junior, USPHL Premier, and Youth AAA programs).

### Autonomous Features Included:
- **100% Autonomous Data Sync via GitHub Actions (Free)**: Runs automatically every hour in the cloud. Reverse-engineered directly with the official USPHL TimeToScore HMAC API engine. Fetches live standings, rosters, cumulative player statistics, scoresheets, and game schedules.
- **Zero Technical Maintenance**: Club staff never need to touch code or manually edit files. New standings and box scores automatically propagate to the website.
- **Live Interactive Scoring & Top Ribbon**: Real-time scores and upcoming game ticker with horizontal drag and mouse wheel support.
- **Dynamic Countdown Timer**: Live countdown to the next Chiefs game.
- **Dual Junior Squads (NCDC & USPHL Premier)**: Full 2026-27 rosters with authentic player headshots, bios, stats, and regular season schedules.
- **Youth Hockey Hub**: Standings, rosters, and live GameSheet / TimeToScore game centers for all 29 Mercer Chiefs youth teams across THF and AHF.
- **Facebook News Carousel**: Rotating news carousel populated directly with authentic media from the official Mercer Chiefs Facebook page.
- **Staff & Coach Portal (`/admin.html`)**: Password-protected console for team toggles, manual overrides, and season rollovers.

---

## 🚀 Autonomous Setup with GitHub (100% Free)

You can host the code on GitHub (either a **Free Public Repository** or **Free Private Repository** with 2,000 free Actions minutes/month). The hourly sync only takes ~2 seconds per run (~2 minutes/month), which is well below the free limits.

### Step 1: Push the Codebase to GitHub
1. Create a new repository on [GitHub.com](https://github.com/new) (e.g. `mercer-chiefs-website`).
2. In your local folder (`d:\Mercer Website`), push your code:
   ```bash
   git init
   git add .
   git commit -m "feat: initial Mercer Chiefs website with autonomous sync"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/mercer-chiefs-website.git
   git push -u origin main
   ```

### Step 2: Enable GitHub Actions Workflow Permissions
To allow the automated bot to commit updated data back to your repository:
1. Go to your repository on GitHub.
2. Click **Settings** → **Actions** → **General**.
3. Scroll down to **Workflow permissions**.
4. Select **Read and write permissions**.
5. Check **Allow GitHub Actions to create and approve pull requests**.
6. Click **Save**.

### Step 3: (Optional) Configure Web Server Auto-Upload via FTP / SFTP
If your website is hosted on an external web server (such as `stonebridgehockey.org`, cPanel, GoDaddy, or Apache):
1. In your GitHub repository, click **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret** and add:
   - `FTP_SERVER`: Your server FTP host (e.g. `ftp.stonebridgehockey.org` or `123.45.67.89`)
   - `FTP_USERNAME`: Your FTP account username
   - `FTP_PASSWORD`: Your FTP account password
   - `FTP_DIR` (optional): Path on server (e.g. `public_html/mercer/` or `htdocs/`)
3. Every hour, GitHub Actions will automatically upload the updated data files directly to your live website!

### Step 4: (Optional) Configure Facebook Page Auto-Sync
If you want automatic syncing of the Mercer Chiefs Facebook page:
1. Under **Settings** → **Secrets and variables** → **Actions**, add:
   - `MERCER_FB_TOKEN`: Your Meta Graph API Page Access Token
2. If left blank, the website automatically preserves the curated authentic Facebook updates.

---

## 🌐 Hosting Options for the Website

### Option 1: GitHub Pages (100% Free Hosting + Auto Sync)
If you want everything free and hosted on GitHub:
1. In your repo, go to **Settings** → **Pages**.
2. Under **Build and deployment** → **Source**, select **Deploy from a branch**.
3. Select branch `main` and folder `/ (root)`.
4. Your website is immediately live at `https://YOUR_USERNAME.github.io/mercer-chiefs-website/`! Any time the hourly bot pushes updated standings, GitHub Pages automatically deploys the update within seconds.

### Option 2: Existing Web Hosting (cPanel / Apache / IIS)
- Extract the included `mercer-chiefs-website.zip` directly into your web root (`public_html/` or `mercer/`).
- The included `.htaccess` file automatically configures proper MIME types for ES Modules and enables compression.
- When GitHub Actions is set up with FTP secrets (from Step 3 above), your live site will update automatically every hour.

---

## 🔐 Staff Portal Access
- **URL**: `admin.html` (e.g. `https://yourdomain.com/admin.html`)
- **Authorized Staff Passkey**: `mercer.2026!`
- **Season Rollover**: Admins can change Season IDs and Team IDs directly in the UI. All legacy 2026-27 overrides are automatically isolated so that a new season starts fresh at 0-0-0 without any ghost data.

---

## 🛠 Manual Local Sync
If you ever want to run the sync locally from your machine:
```bash
npm run sync
# or
node sync_all_data.js
```
