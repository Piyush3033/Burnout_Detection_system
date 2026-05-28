# Burnout Detector

A production-ready burnout detection system with real-time monitoring, ML-powered scoring, and a modern cyberpunk dashboard for wellness tracking.

## Features

- Real-time burnout score calculation (0-100 scale)
- 5-factor weighted algorithm for accurate detection
- Modern cyber/SaaS aesthetic with dark theme
- Fully responsive on mobile and desktop
- PWA support with offline capability
- Admin dashboard for user management
- System health monitoring and alerts
- 30-day trend analysis and forecasting
- Automatic data synchronization

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Framer Motion
- **Backend**: Node.js, Express, MongoDB
- **ML**: FastAPI, Python, scikit-learn
- **Desktop**: Python (activity monitoring)
- **Deployment**: Docker, Vercel, AWS/GCP/Azure

## Quick Start

### Frontend Only

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open http://localhost:3000 and login with:
- Email: `admin@gmail.com`
- Password: `admin123`

### Full System (with Backend)

```bash
# Terminal 1: Frontend
pnpm dev

# Terminal 2: Backend
cd server && npm run dev

# Terminal 3: ML Service (optional)
cd ml-service && python -m uvicorn src.main:app --reload
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- ML Service: http://localhost:8000

## Admin Credentials

Default admin account (auto-created):
- Email: `admin@gmail.com`
- Password: `admin123`

**Important**: Change these credentials in production.

## Project Structure

```
├── app/                    # Next.js frontend
│   ├── (auth)/            # Login/register pages
│   ├── (dashboard)/       # Protected dashboard
│   ├── api/               # API routes
│   └── contexts/          # React contexts
├── components/            # React components
├── hooks/                 # Custom hooks
├── lib/                   # Utilities
├── public/                # Static assets
├── server/                # Express backend
├── ml-service/            # FastAPI ML service
├── desktop-agent/         # Activity monitoring
└── scripts/               # Utility scripts
```

## Deployment

Deploy frontend to Vercel:
```bash
vercel deploy
```

Backend deployment with Docker:
```bash
cd server && docker build -t burnout-backend .
docker run -p 5000:5000 burnout-backend
```

## License

MIT
