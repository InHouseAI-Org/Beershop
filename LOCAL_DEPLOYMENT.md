# Local WiFi Deployment Guide

## 🌐 Your Network Configuration

**Local IP Address:** `192.168.1.36`

**Backend URL:** `http://192.168.1.36:5001/api`
**Frontend URL:** `http://192.168.1.36:3000`

## 📱 How to Access from Mobile

1. Make sure your mobile device is connected to the **same WiFi network** as your Mac
2. Open your mobile browser (Chrome, Safari, etc.)
3. Navigate to: `http://192.168.1.36:3000`

## 🚀 Starting the Application

### Option 1: Quick Start (Recommended)

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd /Users/manavbathija/Desktop/Beershop/backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd /Users/manavbathija/Desktop/Beershop/frontend
npm start
```

### Option 2: Using tmux (Advanced)

```bash
# Start tmux session
tmux new -s beershop

# Start backend (in first pane)
cd /Users/manavbathija/Desktop/Beershop/backend && npm start

# Split window (Ctrl+B then ")
# Start frontend (in second pane)
cd /Users/manavbathija/Desktop/Beershop/frontend && npm start

# Detach from session: Ctrl+B then D
# Reattach later: tmux attach -t beershop
```

## ✅ Verification

### 1. Check Backend
Open browser and go to: `http://192.168.1.36:5001/api/health`

You should see:
```json
{"status":"ok","message":"Server is running"}
```

### 2. Check Frontend
Open browser and go to: `http://192.168.1.36:3000`

You should see the login page.

### 3. Test from Mobile
1. Connect mobile to same WiFi
2. Open mobile browser
3. Go to: `http://192.168.1.36:3000`
4. Login and test the mobile-optimized UI

## 🔥 Firewall Settings (if needed)

If you can't access from mobile, you may need to allow connections:

```bash
# Allow connections on port 3000 (Frontend)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node

# Or temporarily disable firewall (not recommended)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off
```

## 🛑 Stopping the Application

**If using separate terminals:**
- Press `Ctrl+C` in each terminal

**If using tmux:**
```bash
tmux kill-session -t beershop
```

## 🔍 Troubleshooting

### Can't access from mobile?

1. **Check WiFi:** Ensure mobile is on the same network
2. **Check IP:** Your Mac's IP might have changed. Check with:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
3. **Check Firewall:** macOS firewall might be blocking connections
4. **Restart servers:** Stop and restart both backend and frontend

### Wrong API URL?

If you need to change the API URL, update:
`frontend/src/utils/api.js`

### Backend won't start?

Make sure PostgreSQL is running:
```bash
brew services list | grep postgresql
# If not running:
brew services start postgresql
```

## 📱 Mobile-Optimized Features

The app has been optimized for mobile with:
- ✅ Responsive tables (cards on mobile)
- ✅ Touch-friendly buttons
- ✅ Mobile dropdown menus
- ✅ Sticky first column in tables
- ✅ Optimized modals and forms
- ✅ Fluid typography

## 🔐 Default Login Credentials

**Admin:**
- Username: (your admin username)
- Password: (your admin password)

**User:**
- Username: (your user username)
- Password: (your user password)

## 💡 Tips

1. **Keep Mac awake:** Go to System Settings → Energy Saver → Prevent computer from sleeping automatically
2. **QR Code:** You can generate a QR code for the URL to easily share with mobile devices
3. **Bookmark:** Add to mobile home screen for app-like experience

## 🌟 Production Deployment

For production deployment to a real server, see the main README.md file.
