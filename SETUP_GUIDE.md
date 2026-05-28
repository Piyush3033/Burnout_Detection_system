# Burnout Detector - Complete Setup & Deployment Guide

## Overview

This is a production-ready burnout detection system with:
- Advanced AI/ML algorithms (Q-learning, ARIMA, time-series analysis)
- Desktop app (Windows, macOS, Linux)
- Mobile app (iOS, Android)
- Browser extension (Chrome, Firefox)
- Cloud deployment (AWS, GCP, Azure)

---

## Part 1: Frontend Setup

### Prerequisites
- Node.js 18+
- pnpm or npm

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Access: http://localhost:3000

**Default Admin Credentials:**
- Email: admin@gmail.com
- Password: admin123

---

## Part 2: Backend Setup

### Prerequisites
- Node.js 18+
- MongoDB 7.0+ (local or Atlas)
- Python 3.9+

### Backend Installation

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Configure environment variables
# Edit .env and add:
# MONGODB_URI=mongodb://localhost:27017/burnout_detector
# JWT_SECRET=your-secret-key-here
# ML_SERVICE_URL=http://localhost:8000

# Start server
npm run dev
```

Server runs on: http://localhost:5000

### Database Setup

```bash
# MongoDB local setup
mongod

# Or use MongoDB Atlas
# 1. Create account at mongodb.com/cloud/atlas
# 2. Create cluster
# 3. Get connection string
# 4. Add to .env as MONGODB_URI
```

---

## Part 3: ML Service Setup

### Prerequisites
- Python 3.9+
- pip or conda

### ML Service Installation

```bash
# Navigate to ml-service directory
cd ml-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Configure:
# MONGODB_URI=mongodb://localhost:27017/burnout_detector
# BACKEND_URL=http://localhost:5000

# Start ML service
python -m uvicorn src.main:app --reload --port 8000
```

ML Service runs on: http://localhost:8000

---

## Part 4: Desktop App Setup

### Prerequisites
- Node.js 18+
- Python 3.9+
- Git

### Windows Installation

```bash
# Navigate to desktop-app directory
cd desktop-app

# Install Electron dependencies
npm install

# Install Python dependencies for monitoring
pip install psutil keyboard mouse pymongo requests

# Build and run
npm start
```

### macOS Installation

```bash
# Same as Windows, but may need additional permissions
# Grant accessibility permissions when prompted

cd desktop-app
npm install
pip install psutil keyboard mouse pymongo requests
npm start
```

### Linux Installation

```bash
# Install X11 libraries
sudo apt-get install libx11-dev libxdo-dev

# Then follow Windows/macOS steps
cd desktop-app
npm install
pip install psutil keyboard mouse pymongo requests
npm start
```

### Desktop App Usage

1. Application starts on system boot (configurable)
2. Monitors keyboard, mouse, and system metrics
3. Displays real-time activity in system tray
4. Data syncs to backend every 5 minutes
5. View dashboard in browser at http://localhost:3000

---

## Part 5: Mobile App Setup (React Native)

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode (macOS only)
- Android: Android Studio + Android SDK

### iOS Setup

```bash
# Navigate to mobile-app directory
cd mobile-app

# Install dependencies
npm install

# Create app config
# Update app.json with your backend URL

# Run on simulator
npx expo run:ios

# Or build for production
eas build --platform ios
```

### Android Setup

```bash
cd mobile-app

# Install dependencies
npm install

# Update backend URL in app.json

# Run on simulator/device
npx expo run:android

# Or build for production
eas build --platform android
```

### Mobile App Features

- Real-time activity tracking
- App usage analytics
- Sleep detection
- Break reminders
- Push notifications
- Offline data sync

---

## Part 6: Browser Extension Setup

### Chrome Installation

```bash
# Navigate to browser-extension directory
cd browser-extension

# Build extension
npm run build

# Load extension in Chrome:
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the "dist" folder
```

### Firefox Installation

```bash
cd browser-extension

# Build extension
npm run build

# Load extension in Firefox:
# 1. Open about:debugging#/runtime/this-firefox
# 2. Click "Load Temporary Add-on"
# 3. Select manifest.json in dist folder
```

### Extension Features

- Active tab tracking
- Website categorization
- Break reminders
- Focus mode
- Daily reports

---

## Part 7: Data Generation & Testing

### Generate Test Data

```bash
# Backend
cd server

# Create test user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","full_name":"Test User"}'

# Desktop app automatically collects data when running

# Mobile app tracks usage
# Browser extension tracks active tabs
```

### View Data in Dashboard

1. Open http://localhost:3000
2. Login with admin@gmail.com / admin123
3. View user analytics in Admin Panel
4. See reports with AI-generated insights

---

## Part 8: Production Deployment

### Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts to connect Git and deploy
```

### Deploy Backend to AWS

```bash
# 1. Create AWS account
# 2. Setup AWS CLI: aws configure
# 3. Create EC2 instance (Node.js AMI)
# 4. SSH into instance
# 5. Clone repository
# 6. Setup .env variables
# 7. Start server: npm run dev

# Using Docker (recommended)
docker build -t burnout-backend .
docker run -p 5000:5000 -e MONGODB_URI=... burnout-backend
```

### Deploy ML Service to AWS

```bash
# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker build -t ml-service .
docker tag ml-service:latest <account>.dkr.ecr.us-east-1.amazonaws.com/ml-service:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/ml-service:latest

# Deploy to ECS or Lambda
```

### Deploy Database (MongoDB Atlas)

```bash
# 1. Create MongoDB Atlas account
# 2. Create cluster
# 3. Get connection string
# 4. Add IP whitelist
# 5. Update MONGODB_URI in .env
```

### Deploy Desktop App

```bash
# Build installers
cd desktop-app

# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux

# Distribute installers via website
```

### Deploy Mobile App

```bash
cd mobile-app

# iOS (requires Apple Developer account)
eas build --platform ios --auto-submit

# Android (requires Google Play account)
eas build --platform android --auto-submit

# Submit to App Store / Google Play
```

### Kubernetes Deployment

```bash
# Create namespace
kubectl create namespace burnout-detector

# Deploy frontend
kubectl apply -f k8s/frontend-deployment.yaml -n burnout-detector

# Deploy backend
kubectl apply -f k8s/backend-deployment.yaml -n burnout-detector

# Deploy ML service
kubectl apply -f k8s/ml-service-deployment.yaml -n burnout-detector

# Setup ingress
kubectl apply -f k8s/ingress.yaml -n burnout-detector
```

---

## Part 9: Full System Integration

### Complete Local Deployment

```bash
# Terminal 1: Frontend
cd /path/to/project
pnpm dev

# Terminal 2: Backend
cd server
npm run dev

# Terminal 3: ML Service
cd ml-service
source venv/bin/activate
python -m uvicorn src.main:app --reload --port 8000

# Terminal 4: Desktop App
cd desktop-app
npm start

# Terminal 5: Mobile App (optional)
cd mobile-app
npx expo start
```

Then:
1. Open http://localhost:3000
2. Login with admin@gmail.com / admin123
3. Desktop app monitors system
4. Data appears in dashboard in real-time
5. ML service generates reports automatically

---

## Part 10: Configuration

### Environment Variables

**Frontend (.env)**
```
REACT_APP_BACKEND_URL=http://localhost:5000
REACT_APP_ML_SERVICE_URL=http://localhost:8000
```

**Backend (.env)**
```
MONGODB_URI=mongodb://localhost:27017/burnout_detector
JWT_SECRET=your-secret-key-here
NODE_ENV=development
ML_SERVICE_URL=http://localhost:8000
```

**ML Service (.env)**
```
MONGODB_URI=mongodb://localhost:27017/burnout_detector
BACKEND_URL=http://localhost:5000
LOG_LEVEL=INFO
```

---

## Part 11: Troubleshooting

### Frontend won't load
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
pnpm install
pnpm dev
```

### Backend connection refused
```bash
# Check if MongoDB is running
mongod --version

# Check if backend is running on port 5000
lsof -i :5000
```

### ML Service errors
```bash
# Check Python version
python --version  # Should be 3.9+

# Reinstall dependencies
pip install --upgrade -r requirements.txt

# Check MongoDB connection
python -c "import pymongo; pymongo.MongoClient('mongodb://localhost:27017')"
```

### Desktop app not collecting data
```bash
# Check iohook installation
npm list iohook

# Run with elevated privileges
sudo npm start  # On macOS/Linux

# Reinstall platform-specific modules
npm rebuild
```

---

## Part 12: Production Checklist

- [ ] Change admin password in production
- [ ] Set strong JWT_SECRET
- [ ] Enable HTTPS
- [ ] Setup firewall rules
- [ ] Enable database backups
- [ ] Setup monitoring and alerts
- [ ] Configure logging
- [ ] Setup CI/CD pipeline
- [ ] Test automated scaling
- [ ] Document API endpoints
- [ ] Setup error tracking (Sentry)
- [ ] Configure email notifications
- [ ] Test disaster recovery

---

## Support

For issues:
1. Check console logs: `console.log("[v0] ...")`
2. Review error messages
3. Check MongoDB connection
4. Verify all services are running
5. Review environment variables

Contact: support@burnoutdetector.com

