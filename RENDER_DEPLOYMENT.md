# Deploying JobSentry Server to Render (with Cloudflare Frontend)

This guide explains how to deploy the **JobSentry Express Backend Server** to **Render** while running the **Frontend on Cloudflare Pages**.

---

## Architecture Overview

```
┌───────────────────────────────────────┐         ┌───────────────────────────────────────┐
│     Cloudflare Pages (Frontend)       │  CORS   │       Render Web Service (API)        │
│  https://your-site.pages.dev          ├────────►│  https://jobsentry-api.onrender.com   │
│  - React 19 + Vite SPA                │  Fetch  │  - Express + TypeScript (server.ts)   │
│  - VITE_API_URL pointing to Render    │         │  - Gemini 3.8 Flash Hybrid Engine     │
└───────────────────────────────────────┘         └───────────────────────────────────────┘
```

---

## Step 1: Deploy Server to Render

### Option A: Automated (Render Blueprint)
1. Go to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically detect [`render.yaml`](render.yaml) and configure the web service.
5. In the Environment settings, provide your `GEMINI_API_KEY` (optional for rule-based engine, required for Gemini AI inference).
6. Click **Apply**.

---

### Option B: Manual Web Service Configuration
If you prefer configuring manually in Render:

1. Click **New +** > **Web Service**.
2. Connect your GitHub repository (`JOB-SENTRY`).
3. Set the configuration values:
   - **Name**: `jobsentry-api` (or your choice)
   - **Language / Runtime**: `Node`
   - **Branch**: `main`
   - **Region**: Oregon (or closest to your audience)
   - **Build Command**:
     ```bash
     npm install && npm run build:backend
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Instance Type**: `Free`

4. Add **Environment Variables** in Render:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enables production routing & optimizations |
   | `PORT` | `10000` | Port assigned by Render |
   | `GEMINI_API_KEY` | *(your secret key)* | Google Gemini AI Studio key |

5. Under **Advanced**, set **Health Check Path**:
   - `/api/health`

6. Click **Create Web Service**.

Once deployed, copy your Render URL (e.g., `https://jobsentry-api.onrender.com`).

---

## Step 2: Connect Cloudflare Pages to Render

You can connect your Cloudflare Pages frontend to Render using either of the two methods below:

### Method 1: Set `VITE_API_URL` in Cloudflare (Recommended)
1. Open your **Cloudflare Dashboard** > **Workers & Pages**.
2. Select your JobSentry Pages project.
3. Go to **Settings** > **Environment variables**.
4. Add variable under **Production** (and Preview if needed):
   - **Variable name**: `VITE_API_URL`
   - **Value**: `https://jobsentry-api.onrender.com` *(replace with your actual Render URL, no trailing slash)*
5. Trigger a new deployment (or go to **Deployments** > **Retry deployment**).
   - Vite will bake the URL into the client bundle at build time.
   - CORS is already pre-configured in `server.ts` to accept cross-origin requests.

---

### Method 2: Cloudflare Pages Proxy (`_redirects`)
If you do not want to set environment variables:
1. Open [`public/_redirects`](public/_redirects).
2. Uncomment the proxy rule and enter your Render URL:
   ```txt
   /api/*  https://jobsentry-api.onrender.com/api/:splat  200
   /*      /index.html                                     200
   ```
3. Commit and push to GitHub. Cloudflare will automatically proxy all `/api/*` traffic to Render without cross-origin overhead.

---

## Step 3: Verification Checklist

1. **Verify Backend Health**:
   Open in your browser:
   ```
   https://<your-service>.onrender.com/api/health
   ```
   Expected response:
   ```json
   {
     "status": "healthy",
     "service": "JobSentry Backend Service",
     "contractVersion": "2.0.0-zero-fallback",
     "hasGeminiKey": true
   }
   ```

2. **Verify Frontend UI**:
   Open your Cloudflare URL (`https://<project>.pages.dev`).
   - Run a test scan using **Try Example** (e.g. Telegram Fee Scam).
   - Verify that the result card renders with risk score, red flags, and advice.
   - Check the **Audit History** table and **Academic Research** dashboard tabs.
