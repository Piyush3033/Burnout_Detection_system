# Burnout Detector - Quick Start (5 Minutes)

## Start Everything Now

### Open 4 Terminal Windows

**Terminal 1: Frontend**
```bash
pnpm install
pnpm dev
```
Open http://localhost:3000
Login: admin@gmail.com / admin123

**Terminal 2: Backend**
```bash
cd server
npm install
# Create .env: MONGODB_URI=mongodb://localhost:27017/burnout_detector
npm run dev
```
API: http://localhost:5000

**Terminal 3: ML Service**
```bash
cd ml-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn src.main:app --reload --port 8000
```
API: http://localhost:8000

**Terminal 4: Desktop App**
```bash
cd desktop-app
npm install
pip install psutil keyboard mouse pymongo requests
npm start
```

## Wait 5-10 Minutes

Desktop app automatically collects:
- Keyboard/mouse activity
- Screen time
- Break frequency
- System metrics

## View Results

1. Go to http://localhost:3000 → Analytics tab
2. See real-time burnout score (0-100)
3. View 30-day history
4. Check AI recommendations
5. See 7-day forecast

## Key Features

### Dashboard
- Real-time burnout score
- 5-factor analysis
- Risk level (low/medium/high/critical)

### Analytics
- 30-day burnout history
- Weekly patterns
- 7-day forecast
- Anomaly detection

### Reports
- Weekly AI insights
- Personalized recommendations
- Impact estimates

### Admin Panel
- User management
- System health
- Job monitoring

## Default Credentials

Email: admin@gmail.com
Password: admin123

## Files to Read

1. **SETUP_GUIDE.md** - Complete 12-part installation guide
2. **PRODUCTION_READY.md** - Architecture and deployment
3. **BUILD_COMPLETE_SUMMARY.md** - What's been built

## Troubleshooting

**Frontend won't load?**
```bash
rm -rf node_modules && pnpm install && pnpm dev
```

**Backend connection failed?**
```bash
# Make sure MongoDB is running
mongod
# Check backend is on port 5000
lsof -i :5000
```

**ML Service error?**
```bash
# Reinstall Python deps
pip install --upgrade -r requirements.txt
```

**Desktop app not collecting?**
```bash
# Rebuild and restart
npm rebuild && npm start
```

## What's Next?

1. Generate 24 hours of test data
2. Read PRODUCTION_READY.md for architecture
3. Deploy to cloud (AWS/GCP/Azure)
4. Add more users
5. Configure monitoring

## Production Deployment

```bash
# Frontend → Vercel
vercel deploy

# Backend → AWS/Heroku
# ML Service → AWS Lambda/EC2
# Database → MongoDB Atlas
# Desktop App → Installers
```

See SETUP_GUIDE.md Part 8 for details.

---

**That's it! You now have a complete burnout detection system running locally.**

Next: Read PRODUCTION_READY.md for full system overview
