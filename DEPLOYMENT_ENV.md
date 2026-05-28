# Environment variables (copy into dashboards)

## Vercel — Project → Settings → Environment Variables

| Key | Value |
|-----|--------|
| `BACKEND_URL` | `https://burnout-detection-system.onrender.com` |
| `NEXT_PUBLIC_BACKEND_URL` | `https://burnout-detection-system.onrender.com` |
| `NEXT_PUBLIC_ML_URL` | `https://ml-service-1nhu.onrender.com` |

Apply to **Production**, **Preview**, and **Development**. Then **Redeploy**.

> `BACKEND_URL` is required for login/API proxy routes.  
> Do **not** use a trailing slash on URLs.

---

## Render — `burnout-backend` service

| Key | Value |
|-----|--------|
| `MONGODB_URI` | `mongodb+srv://piyush_db:****@clusterburnout.mjgrhon.mongodb.net/burnout?retryWrites=true&w=majority&appName=ClusterBurnout` |
| `JWT_SECRET` | *(your secret — rotate if exposed)* |
| `CORS_ORIGIN` | `https://burnout-detection-system-v212.vercel.app` |
| `ML_SERVICE_URL` | `https://ml-service-1nhu.onrender.com` |

---

## Render — `ml-service` service

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Same MongoDB URI as backend (with `/burnout` database) |

---

## Syntax fixes (from your list)

Wrong:
```
CORS_ORIGIN: "https://..."
NEXT_PUBLIC_BACKEND_URL "https://...
```

Correct:
```
CORS_ORIGIN=https://burnout-detection-system-v212.vercel.app
NEXT_PUBLIC_BACKEND_URL=https://burnout-detection-system.onrender.com
```

---

## Verify after deploy

1. Backend: https://burnout-detection-system.onrender.com/health → `{"status":"ok"}`
2. Login on Vercel with `admin@gmail.com` / `admin123`
3. Dashboard should show live score within ~30s (mobile/desktop collector or wait for data)

---

## Security

If these secrets were shared publicly, **rotate** `JWT_SECRET` and your MongoDB user password in Atlas, then update Render/Vercel.
