const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { PythonMonitor } = require('./src/python-monitor');
const { ActivityCollector } = require('./src/activity-collector');

let mainWindow;
let pythonMonitor;
let activityCollector;

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });

  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize background monitors
async function initializeMonitors() {
  try {
    // Start Python monitoring service
    pythonMonitor = new PythonMonitor();
    await pythonMonitor.start();
    console.log('[v0] Python monitor started');

    // Start activity collector
    activityCollector = new ActivityCollector();
    activityCollector.start();
    console.log('[v0] Activity collector started');
  } catch (error) {
    console.error('[v0] Failed to initialize monitors:', error);
  }
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            console.log('Burnout Detector Desktop v1.0.0');
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// App lifecycle
app.on('ready', async () => {
  createWindow();
  createMenu();
  await initializeMonitors();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('get-system-status', async () => {
  return {
    monitoring: pythonMonitor ? pythonMonitor.isRunning : false,
    backend_url: process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000',
    version: app.getVersion()
  };
});

ipcMain.handle('start-monitoring', async () => {
  if (pythonMonitor && !pythonMonitor.isRunning) {
    await pythonMonitor.start();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('stop-monitoring', async () => {
  if (pythonMonitor && pythonMonitor.isRunning) {
    await pythonMonitor.stop();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('get-activity-data', async () => {
  return activityCollector ? activityCollector.getRecentActivity() : {};
});

ipcMain.on('log-activity', (event, data) => {
  if (activityCollector) {
    activityCollector.logActivity(data);
  }
});
