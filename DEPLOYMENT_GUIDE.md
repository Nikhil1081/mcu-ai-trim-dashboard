# Deployment Guide: Frontend on Firebase & Backend on Render

This guide walks you through deploying the **MCU AI Trim & Wafer Sort Console**:
- **Backend (Python Flask + Machine Learning Models)** on **Render** (Free tier Web Service)
- **Frontend (Semiconductor Dark ATE Console UI)** on **Firebase Hosting** (Free tier Global CDN)

---

## 1. Architecture Overview

```
 [User Browser]
       │
       ▼
 [Firebase Hosting]  ────────>  [Render Backend]
 (Static HTML/CSS/JS)    REST    (Flask + Gunicorn + ML Models)
  - auth.html             API    - /api/auth/login
  - index.html                   - /api/summary
  - config.js                    - /api/predict
  - js/app.js                    - /api/upload
```

---

## Part 1: Deploy Backend to Render

### Step 1: Push Code to GitHub
1. Open PowerShell or Terminal in the project root:
   ```powershell
   cd C:\Users\Nikhil\Downloads\mcu-ai-trim-dashboard\mcu-ai-trim-dashboard
   git init
   git add .
   git commit -m "Semiconductor ATE console with Render & Firebase support"
   ```
2. Create a new repository on [GitHub](https://github.com/new) (e.g., `mcu-ai-trim-dashboard`).
3. Link and push to your GitHub repo:
   ```powershell
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/mcu-ai-trim-dashboard.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Create Web Service on Render
1. Go to [dashboard.render.com](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your GitHub repository `mcu-ai-trim-dashboard`.
3. Configure the settings:
   - **Name:** `mcu-ai-trim-backend` (or your choice)
   - **Region:** Closest to you (e.g. Frankfurt, Oregon, Singapore)
   - **Branch:** `main`
   - **Root Directory:** Leave blank (or set if using nested repo)
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
   - **Instance Type:** `Free`
4. Under **Environment Variables**, add:
   - `SECRET_KEY` = `semicon-super-secret-key-2026`
   - `ADMIN_EMAIL` = `admin@semicon.com`
   - `ADMIN_PASSWORD` = `YourSecurePassword123`
5. Click **Create Web Service**.
6. Wait 2-3 minutes for the build to finish. Once live, Render will give you a public URL (e.g., `https://mcu-ai-trim-backend.onrender.com`).
7. **Copy this Render URL.**

---

## Part 2: Connect Frontend & Deploy to Firebase Hosting

### Step 1: Update API URL in `frontend/config.js`
Open `frontend/config.js` and paste your Render URL:
```javascript
// frontend/config.js
window.API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://127.0.0.1:5000'
  : 'https://mcu-ai-trim-backend.onrender.com'; // <--- PASTE YOUR RENDER URL HERE
```

### Step 2: Initialize & Deploy with Firebase CLI
1. Open PowerShell and navigate to the project directory:
   ```powershell
   cd C:\Users\Nikhil\Downloads\mcu-ai-trim-dashboard\mcu-ai-trim-dashboard
   ```
2. Log in to Firebase (a browser window will open):
   ```powershell
   firebase login
   ```
3. Initialize Firebase Hosting:
   ```powershell
   firebase init hosting
   ```
   Follow the prompts:
   - **Select:** `Use an existing project` (or `Create a new project`)
   - **What do you want to use as your public directory?** `frontend`
   - **Configure as a single-page app (rewrite all urls to /index.html)?** `Yes`
   - **Set up automatic builds and deploys with GitHub?** `No`
   - **File frontend/index.html already exists. Overwrite?** **`No`** (Crucial: type `N` so it keeps your wafer console!)
4. Deploy the frontend to Firebase:
   ```powershell
   firebase deploy --only hosting
   ```
5. Firebase will print your live URL:
   ```text
   Hosting URL: https://YOUR-PROJECT-ID.web.app
   ```

---

## Part 3: Verify Your Deployment

1. Visit your Firebase URL: `https://YOUR-PROJECT-ID.web.app`
2. You will be greeted by the dark semiconductor ATE login console.
3. Click **Register** to create an operator account or sign in with your credentials.
4. Try:
   - Clicking **Nominal**, **Slow Corner**, **Fast Corner**, or **Wafer Edge** presets.
   - Watch the SVG reticle lock onto the silicon wafer coordinate.
   - Click **Execute AI Laser Trim Inference** to see instant 7-bit binary fuse register calculations and test status.
   - Upload any batch wafer CSV for bulk sorting!
