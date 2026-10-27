# How to Host Madani ID Platform on Render (render.com)

This guide provides complete, step-by-step instructions to deploy both the **FastAPI Backend**, **Next.js Frontend**, and **Managed PostgreSQL Database** on [Render](https://render.com).

---

## Architecture on Render

```text
  [ User Browser ]
         |
         +---------------------------------------+
         |                                       |
         v (Web Traffic)                         v (API / Auth Calls)
+-----------------------+              +-----------------------+
|   madani-frontend     |              |    madani-backend     |
|   (Next.js Service)   |              |   (FastAPI Service)   |
|   Port $PORT (10000)  |              |   Port $PORT (10000)  |
+-----------------------+              +-----------------------+
                                                   |
                                                   v (Internal / External DB Connection)
                                       +-----------------------+
                                       |       madani-db       |
                                       | (Managed PostgreSQL)  |
                                       +-----------------------+
```

---

## Method 1: Automatic 1-Click Blueprint (Recommended)

Because we have added [render.yaml](file:///c:/Users/niran/Desktop/Madani/render.yaml) to your repository, Render can provision everything automatically in one click.

### Step 1: Push Code to GitHub
Ensure all changes are pushed to your GitHub repository:
```bash
git push origin main
```

### Step 2: Open Render Dashboard
1. Go to [https://dashboard.render.com](https://dashboard.render.com).
2. Log in with your GitHub account.

### Step 3: Create Blueprint Instance
1. In the Render top navigation, click **New +** and select **Blueprint**.
2. Connect your repository: `MOHAMEDYUNUS-A/madani`.
3. Give your Blueprint a group name (e.g., `madani-production`).
4. Render will automatically read `render.yaml` and show:
   * **Database**: `madani-db` (PostgreSQL)
   * **Web Service**: `madani-backend` (FastAPI)
   * **Web Service**: `madani-frontend` (Next.js)
5. Click **Apply**.
6. Render will build and deploy all services in the correct dependency order!

---

## Method 2: Manual Setup via Render Dashboard

If you prefer to configure each service manually in the UI:

### Step 1: Create PostgreSQL Database on Render
1. Click **New +** -> **PostgreSQL**.
2. Set the following fields:
   * **Name**: `madani-db`
   * **Database**: `madani_db`
   * **User**: `madani_user`
   * **Region**: `Oregon (US West)` (or closest to you)
   * **Plan**: `Free`
3. Click **Create Database**.
4. Once created, copy the **Internal Database URL** (e.g., `postgres://madani_user:...@dpg-...:5432/madani_db`).

---

### Step 2: Create FastAPI Backend Web Service
1. Click **New +** -> **Web Service**.
2. Select your repository: `MOHAMEDYUNUS-A/madani`.
3. Configure the settings:
   * **Name**: `madani-backend`
   * **Region**: Same as database (e.g., `Oregon`)
   * **Branch**: `main`
   * **Root Directory**: `backend`
   * **Runtime**: `Python 3`
   * **Build Command**:
     ```bash
     pip install --upgrade pip && pip install -r requirements.txt
     ```
   * **Start Command**:
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   * **Plan**: `Free`
4. Expand **Advanced** -> **Health Check Path**: `/health`
5. Click **Add Environment Variable** and add:
   * `ENV` = `production`
   * `DATABASE_URL` = paste the **Internal Database URL** from Step 1.
   * `JWT_SECRET` = click **Generate** or paste a 64-character random string.
   * `JWT_ALGORITHM` = `HS256`
   * `ACCESS_TOKEN_EXPIRE_MINUTES` = `1440`
   * `STORAGE_MODE` = `local`
   * `STORAGE_DIR` = `/tmp/madani_storage`
   * `CORS_ORIGINS` = `https://madani-frontend.onrender.com,http://localhost:3000`
6. Click **Create Web Service**.
7. Copy your backend service URL when deployed (e.g., `https://madani-backend.onrender.com`).

---

### Step 3: Create Next.js Frontend Web Service
1. Click **New +** -> **Web Service**.
2. Select your repository: `MOHAMEDYUNUS-A/madani`.
3. Configure the settings:
   * **Name**: `madani-frontend`
   * **Region**: Same as backend (e.g., `Oregon`)
   * **Branch**: `main`
   * **Root Directory**: `frontend`
   * **Runtime**: `Node`
   * **Build Command**:
     ```bash
     npm install --legacy-peer-deps && npm run build
     ```
   * **Start Command**:
     ```bash
     npm start
     ```
   * **Plan**: `Free`
4. Expand **Advanced** -> **Environment Variables**:
   * `NODE_ENV` = `production`
   * `NEXT_PUBLIC_API_URL` = paste your backend URL from Step 2 (e.g., `https://madani-backend.onrender.com`).
5. Click **Create Web Service**.

---

## Step 4: Seed Initial Admin User in Production

Once the backend is deployed, you can seed initial sample data or your Super Admin account using Render's built-in **Shell**:

1. In the Render Dashboard, click your `madani-backend` service.
2. In the left sidebar, click **Shell**.
3. Run the Python interactive shell or seed script:
   ```bash
   python -c "from app.core.database import SessionLocal; from app.models.user import User; from passlib.context import CryptContext; pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto'); db = SessionLocal(); u = User(username='admin', email='admin@madani.com', hashed_password=pwd_context.hash('MadaniAdmin2026!'), role='superadmin', is_active=True); db.add(u); db.commit(); print('Admin user created successfully!')"
   ```
4. Now you can log in at `https://madani-frontend.onrender.com/login` with:
   * **Username**: `admin`
   * **Password**: `MadaniAdmin2026!`

---

## Important Render Tips & Troubleshooting

### 1. Free Tier Inactivity Spin-Down
Render's free tier spins down web services after 15 minutes of inactivity. When a new request arrives, it may take 30–50 seconds to wake up (cold-start).
* **Fix**: Use a free uptime monitor (like [UptimeRobot](https://uptimerobot.com)) to ping `https://madani-backend.onrender.com/health` every 10 minutes to keep it warm!

### 2. Cross-Origin (CORS) Issues
If the frontend shows network errors, check `CORS_ORIGINS` in your backend environment variables:
Make sure your exact frontend domain is included (e.g., `https://madani-frontend.onrender.com` without trailing slash).

### 3. PostgreSQL URL Format
Render provides database connection strings starting with `postgres://`. The backend code in `app/core/database.py` has already been updated to automatically normalize this to `postgresql://` required by SQLAlchemy 2.0.

### 4. Custom Domains & Free SSL
Render provides free automated TLS/SSL certificates:
1. In Render Dashboard, click your service -> **Settings** -> **Custom Domains**.
2. Add your domain (e.g., `app.yourdomain.com`).
3. Add the `CNAME` record in your DNS provider pointing to `madani-frontend.onrender.com`.
