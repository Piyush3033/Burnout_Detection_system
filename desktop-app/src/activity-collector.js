const ioHook = require('iohook');
const os = require('os');
const { execSync } = require('child_process');

class ActivityCollector {
  constructor() {
    this.activities = [];
    this.isRunning = false;
    this.keyboardEvents = 0;
    this.mouseEvents = 0;
    this.lastActivityTime = Date.now();
    this.idleThreshold = 5 * 60 * 1000; // 5 minutes
  }

  start() {
    try {
      // Keyboard events
      ioHook.on('keydown', () => {
        this.keyboardEvents++;
        this.lastActivityTime = Date.now();
      });

      // Mouse events
      ioHook.on('mousemove', () => {
        this.mouseEvents++;
        this.lastActivityTime = Date.now();
      });

      // Start the hook
      ioHook.start();
      this.isRunning = true;

      // Collect system metrics every 60 seconds
      this.metricsInterval = setInterval(() => {
        this.collectMetrics();
      }, 60000);

      console.log('[v0] Activity collector started');
    } catch (error) {
      console.error('[v0] Failed to start activity collector:', error);
    }
  }

  stop() {
    try {
      ioHook.stop();
      clearInterval(this.metricsInterval);
      this.isRunning = false;
      console.log('[v0] Activity collector stopped');
    } catch (error) {
      console.error('[v0] Failed to stop activity collector:', error);
    }
  }

  collectMetrics() {
    const isIdle = (Date.now() - this.lastActivityTime) > this.idleThreshold;

    const metric = {
      timestamp: new Date().toISOString(),
      keyboard_events: this.keyboardEvents,
      mouse_events: this.mouseEvents,
      is_idle: isIdle,
      system: {
        platform: os.platform(),
        cpu_usage: this.getCpuUsage(),
        memory_usage: this.getMemoryUsage()
      }
    };

    this.activities.push(metric);

    // Keep only last 1000 entries in memory
    if (this.activities.length > 1000) {
      this.activities = this.activities.slice(-1000);
    }

    // Reset counters
    this.keyboardEvents = 0;
    this.mouseEvents = 0;
  }

  getCpuUsage() {
    try {
      if (os.platform() === 'win32') {
        const result = execSync('wmic os get totalvisiblememorytime,loadpercentage').toString();
        const lines = result.split('\n');
        if (lines.length > 1) {
          const values = lines[1].trim().split(/\s+/);
          return parseFloat(values[0]) || 0;
        }
      } else {
        const result = execSync("ps aux | grep -v grep | awk '{sum+=$3} END {print sum}'").toString();
        return parseFloat(result) || 0;
      }
    } catch (error) {
      console.error('[v0] Failed to get CPU usage:', error);
      return 0;
    }
  }

  getMemoryUsage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    return Math.round((usedMemory / totalMemory) * 100);
  }

  logActivity(data) {
    this.activities.push({
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  getRecentActivity(minutes = 60) {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    return {
      total_events: this.activities.filter(a => new Date(a.timestamp).getTime() > cutoffTime).length,
      keyboard_events: this.activities.filter(a => a.keyboard_events).reduce((sum, a) => sum + a.keyboard_events, 0),
      mouse_events: this.activities.filter(a => a.mouse_events).reduce((sum, a) => sum + a.mouse_events, 0),
      idle_time_percent: this.calculateIdlePercentage(cutoffTime),
      recent_activities: this.activities.slice(-20)
    };
  }

  calculateIdlePercentage(cutoffTime) {
    const recentActivities = this.activities.filter(a => new Date(a.timestamp).getTime() > cutoffTime);
    if (recentActivities.length === 0) return 100;

    const idleCount = recentActivities.filter(a => a.is_idle).length;
    return Math.round((idleCount / recentActivities.length) * 100);
  }
}

module.exports = { ActivityCollector };
