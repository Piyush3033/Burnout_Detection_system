"""
Data collection module for OS-level monitoring
Collects activity, application usage, keyboard/mouse events, and system metrics
"""

import ctypes
import logging
import platform
import subprocess
import time
from datetime import datetime
from typing import Dict, List, Any

import psutil
from pynput import keyboard, mouse

logger = logging.getLogger(__name__)


class DataCollector:
    """Collects OS-level data for burnout detection"""
    
    def __init__(self):
        self.session_start = datetime.utcnow()
        self.last_activity_time = datetime.utcnow()
        self.keyboard_event_count = 0
        self.mouse_event_count = 0
        self.active_window_history: List[str] = []
        self.active_window_change_count = 0
        
        # Track listeners
        self._setup_event_listeners()
        
        logger.info('DataCollector initialized')
    
    def _setup_event_listeners(self):
        """Setup keyboard and mouse event listeners"""
        try:
            self.keyboard_listener = keyboard.Listener(on_press=self._on_key_press)
            self.keyboard_listener.start()

            self.mouse_listener = mouse.Listener(on_move=self._on_mouse_move, on_click=self._on_mouse_click)
            self.mouse_listener.start()

            logger.info('Event listeners started')
        except Exception as e:
            logger.error(f'Failed to setup event listeners: {str(e)}')
    
    def _on_key_press(self, key):
        """Handle keyboard events"""
        try:
            self.keyboard_event_count += 1
            self.last_activity_time = datetime.utcnow()
        except Exception:
            pass
    
    def collect_activity(self) -> Dict[str, Any]:
        """Collect user activity data"""
        try:
            idle_time = self._calculate_idle_time()
            keyboard_activity = self.keyboard_event_count
            mouse_activity = self.mouse_event_count
            active_window = self._get_active_window()

            if self.active_window_history and self.active_window_history[-1] != active_window:
                self.active_window_change_count += 1
            self.active_window_history.append(active_window)

            self.keyboard_event_count = 0
            self.mouse_event_count = 0

            total_seconds = int((datetime.utcnow() - self.session_start).total_seconds())
            screen_time_minutes = max(0.0, round((total_seconds - idle_time) / 60, 2))

            return {
                'idle_time_seconds': idle_time,
                'idle_time_minutes': round(idle_time / 60, 2),
                'keyboard_events': keyboard_activity,
                'mouse_events': mouse_activity,
                'app_switches': self.active_window_change_count,
                'active_window': active_window,
                'screen_time_minutes': screen_time_minutes,
                'total_screen_time_minutes': screen_time_minutes,
                'cpu_uptime_seconds': self.get_cpu_uptime(),
                'total_activity_score': self._calculate_activity_score(
                    idle_time, keyboard_activity, mouse_activity
                ),
                'timestamp': datetime.utcnow().isoformat() + 'Z',
            }
        except Exception as e:
            logger.error(f'Error collecting activity: {str(e)}')
            return {}
    
    def collect_system_metrics(self) -> Dict[str, Any]:
        """Collect system resource usage"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            
            process_count = len(psutil.pids())
            
            return {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_available_mb': memory.available / (1024 * 1024),
                'process_count': process_count,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
            }
        except Exception as e:
            logger.error(f'Error collecting system metrics: {str(e)}')
            return {}
    
    def get_cpu_uptime(self) -> int:
        """Get CPU uptime in seconds"""
        try:
            return int(time.time() - psutil.boot_time())
        except Exception:
            return 0

    def _get_active_window(self) -> str:
        """Get the currently active window title"""
        try:
            system_name = platform.system().lower()
            if system_name == 'windows':
                user32 = ctypes.windll.user32
                hwnd = user32.GetForegroundWindow()
                length = user32.GetWindowTextLengthW(hwnd)
                buffer = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buffer, length + 1)
                return buffer.value or 'unknown'

            if system_name == 'darwin':
                result = subprocess.check_output([
                    'osascript',
                    '-e',
                    'tell application "System Events" to get name of first process whose frontmost is true'
                ], text=True)
                return result.strip() or 'unknown'

            if system_name == 'linux':
                result = subprocess.check_output(['xdotool', 'getactivewindow', 'getwindowname'], text=True)
                return result.strip() or 'unknown'
        except Exception:
            return 'unknown'

        return 'unknown'
    
    def _calculate_idle_time(self) -> int:
        """Calculate idle time in seconds"""
        return int((datetime.utcnow() - self.last_activity_time).total_seconds())

    def _on_mouse_move(self, x, y):
        try:
            self.mouse_event_count += 1
            self.last_activity_time = datetime.utcnow()
        except Exception:
            pass

    def _on_mouse_click(self, x, y, button, pressed):
        try:
            if pressed:
                self.mouse_event_count += 1
                self.last_activity_time = datetime.utcnow()
        except Exception:
            pass
    
    @staticmethod
    def _calculate_activity_score(
        idle_time: int, 
        keyboard_events: int, 
        mouse_events: int
    ) -> float:
        """
        Calculate activity score (0-100)
        Higher score = more active
        """
        idle_penalty = min(idle_time / 300, 100)
        activity_bonus = min((keyboard_events + mouse_events) / 100, 100)
        
        score = 100 - idle_penalty + (activity_bonus * 0.5)
        return max(0, min(100, score))
    
    def cleanup(self):
        """Cleanup resources"""
        if hasattr(self, 'keyboard_listener'):
            self.keyboard_listener.stop()
        if hasattr(self, 'mouse_listener'):
            self.mouse_listener.stop()
        logger.info('DataCollector cleaned up')
