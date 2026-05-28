const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

class PythonMonitor {
  constructor() {
    this.process = null;
    this.isRunning = false;
    this.pythonPath = this.getPythonPath();
  }

  getPythonPath() {
    const platform = os.platform();
    if (platform === 'win32') {
      return 'python';
    }
    return 'python3';
  }

  async start() {
    try {
      const monitorScript = path.join(__dirname, '../../../desktop-agent/src/main.py');
      
      this.process = spawn(this.pythonPath, [monitorScript], {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.process.stdout.on('data', (data) => {
        console.log(`[Python Monitor] ${data.toString()}`);
      });

      this.process.stderr.on('data', (data) => {
        console.error(`[Python Monitor Error] ${data.toString()}`);
      });

      this.process.on('close', (code) => {
        console.log(`[Python Monitor] Process exited with code ${code}`);
        this.isRunning = false;
      });

      this.isRunning = true;
      console.log('[v0] Python monitoring process started');
    } catch (error) {
      console.error('[v0] Failed to start Python monitor:', error);
      throw error;
    }
  }

  async stop() {
    if (this.process && this.isRunning) {
      return new Promise((resolve) => {
        this.process.on('exit', () => {
          this.isRunning = false;
          resolve();
        });
        this.process.kill();
      });
    }
  }
}

module.exports = { PythonMonitor };
