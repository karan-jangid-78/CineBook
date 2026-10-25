# 🚀 CineBook Deployment Guide

This guide explains how to push your code to GitHub (`karan-jangid-78/CineBook`) and deploy the application live on the web for free.

---

## Part 1: Push Code to GitHub

Your local git repository has been initialized, all 61 production-ready files are committed to branch `main`, and the remote is configured:
- **Repository:** `https://github.com/karan-jangid-78/CineBook.git`
- **Branch:** `main`

### Option A: Push via Windows Terminal (Browser Login)
Open PowerShell and run:
```powershell
cd "c:\Users\hp\Desktop\ticket project"
git push -u origin main
```
> Windows Git Credential Manager will display a small browser popup asking you to sign into GitHub. Click **"Authorize / Sign In"** and it will push automatically!

### Option B: Push using a GitHub Personal Access Token (PAT)
If you already have a GitHub Personal Access Token (or want to create one with `repo` scope at [github.com/settings/tokens](https://github.com/settings/tokens)):
```powershell
cd "c:\Users\hp\Desktop\ticket project"
git remote set-url origin https://<YOUR_GITHUB_TOKEN>@github.com/karan-jangid-78/CineBook.git
git push -u origin main
```

---

## Part 2: Deploying Live for Free

We have configured CineBook to support both **Unified 1-Service Deployment** (easiest) and **Decoupled Deployment** (Vercel + Render).

### Database Setup: Free MongoDB Atlas (Required for Production)

Production environments require a persistent cloud database. Embedded in-memory MongoDB is strictly disabled in production to protect against data loss when containers sleep.

1. Sign up for free at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a free **M0 Shared Cluster** (e.g. AWS / Mumbai or Frankfurt).
3. Under **Database Access**, create a database user (e.g., `cinebook_admin`) with a secure password.
4. Under **Network Access**, add IP `0.0.0.0/0` (Allow access from anywhere).
5. Click **Connect** -> **Drivers** -> Copy your connection string:
   ```text
   mongodb+srv://cinebook_admin:<PASSWORD>@cluster0.xxxx.mongodb.net/cinebook?retryWrites=true&w=majority
   ```

---

### Method 1: Render (Unified Full-Stack Deployment — Recommended)
Render hosts both the Express API and the React Vite frontend together under a single domain with zero CORS complications.

1. Sign in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub account and select repository **`karan-jangid-78/CineBook`**.
4. Configure the settings:
   - **Environment:** `Node`
   - **Build Command:** `npm run install-all && npm run build`
   - **Start Command:** `npm start`
5. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `MONGO_URI`: `mongodb+srv://cinebook_admin:<PASSWORD>@cluster0.xxxx.mongodb.net/cinebook?retryWrites=true&w=majority`
   - `JWT_SECRET`: A strong 32+ character random secret (or click Generate)
   - `AUTO_SEED`: `true` *(set to `true` on your first deploy to safely seed demo movies and users; will never overwrite existing data)*
6. Click **Deploy Web Service**!
   Your site will be live at `https://cinebook-xxxx.onrender.com`.

---

### Method 2: Vercel (Frontend) + Render (Backend)

#### Step 1: Deploy Backend on Render
1. In Render, create a Web Service pointing to `backend`.
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Environment Variables:
   - `NODE_ENV`: `production`
   - `MONGO_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: A strong random secret
   - `CLIENT_URL`: `https://cinebook.vercel.app` (your frontend domain)
5. Copy your backend URL (e.g., `https://cinebook-api.onrender.com`).

#### Step 2: Deploy Frontend on Vercel
1. Sign in to [vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
2. Import **`karan-jangid-78/CineBook`**.
3. Under **Project Settings**:
   - **Root Directory:** select `frontend`
   - **Framework Preset:** `Vite`
4. Under **Environment Variables**, add:
   - Key: `VITE_API_URL`
   - Value: `https://cinebook-api.onrender.com` (your Render backend URL)
5. Click **Deploy**!
   Vercel will give you a live URL like `https://cinebook.vercel.app`.
