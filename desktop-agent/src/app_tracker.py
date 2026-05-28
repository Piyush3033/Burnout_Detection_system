"""
Tracks foreground app time and enumerates running applications on the system.
"""

import logging
import os
import platform
from typing import Any, Dict, List, Optional

import psutil

logger = logging.getLogger(__name__)

# Processes to exclude from the running-apps list (lowercase)
IGNORE_PROCESSES = frozenset({
    'system idle process',
    'system',
    'registry',
    'memcompression',
    'idle',
    'svchost.exe',
    'csrss.exe',
    'lsass.exe',
    'services.exe',
    'smss.exe',
    'wininit.exe',
    'winlogon.exe',
    'dwm.exe',
    'fontdrvhost.exe',
    'conhost.exe',
    'runtimebroker.exe',
    'searchindexer.exe',
    'searchprotocolhost.exe',
    'securityhealthservice.exe',
    'sihost.exe',
    'taskhostw.exe',
    'dllhost.exe',
    'aggregatorhost.exe',
})

# Friendly names for common executables
FRIENDLY_NAMES = {
    'chrome.exe': 'Google Chrome',
    'msedge.exe': 'Microsoft Edge',
    'firefox.exe': 'Firefox',
    'code.exe': 'Visual Studio Code',
    'cursor.exe': 'Cursor',
    'devenv.exe': 'Visual Studio',
    'explorer.exe': 'File Explorer',
    'slack.exe': 'Slack',
    'discord.exe': 'Discord',
    'teams.exe': 'Microsoft Teams',
    'spotify.exe': 'Spotify',
    'notepad.exe': 'Notepad',
    'winword.exe': 'Microsoft Word',
    'excel.exe': 'Microsoft Excel',
    'powerpnt.exe': 'PowerPoint',
    'outlook.exe': 'Outlook',
    'python.exe': 'Python',
    'node.exe': 'Node.js',
    'pwsh.exe': 'PowerShell',
    'windowsterminal.exe': 'Windows Terminal',
    'cmd.exe': 'Command Prompt',
}


def normalize_app_name(name: Optional[str], exe: Optional[str] = None, window_title: Optional[str] = None) -> str:
    """Convert process/window info into a readable application name."""
    if window_title and window_title.strip() and window_title.lower() not in ('unknown', ''):
        title = window_title.strip()
        if ' - ' in title:
            return title.split(' - ')[-1].strip() or title
        return title[:120]

    base = (name or '').strip()
    if exe:
        base = os.path.basename(exe) or base

    lower = base.lower()
    if lower in FRIENDLY_NAMES:
        return FRIENDLY_NAMES[lower]
    if lower.endswith('.exe'):
        return base[:-4].replace('_', ' ').title()
    return base or 'unknown'


class ApplicationTracker:
    """Accumulates per-app foreground seconds and snapshots running processes."""

    def __init__(self, interval_seconds: float = 5.0):
        self.interval_seconds = interval_seconds
        self._foreground_seconds: Dict[str, float] = {}
        self._last_foreground_app: Optional[str] = None

    def set_interval(self, seconds: float) -> None:
        self.interval_seconds = max(1.0, seconds)

    def tick(self, active_window: str, idle_seconds: int = 0) -> None:
        """Credit the current interval to the foreground application."""
        app_name = normalize_app_name(None, window_title=active_window)
        if idle_seconds >= self.interval_seconds:
            self._last_foreground_app = None
            return

        credit = self.interval_seconds
        self._foreground_seconds[app_name] = self._foreground_seconds.get(app_name, 0.0) + credit
        self._last_foreground_app = app_name

    def flush_usage(self) -> List[Dict[str, Any]]:
        """Return app_usage for this interval and reset foreground counters."""
        usage = [
            {
                'app_name': name,
                'duration_minutes': round(seconds / 60.0, 4),
                'is_foreground': True,
            }
            for name, seconds in self._foreground_seconds.items()
            if seconds > 0
        ]
        usage.sort(key=lambda x: x['duration_minutes'], reverse=True)
        self._foreground_seconds = {}
        return usage

    def get_running_applications(self) -> List[Dict[str, Any]]:
        """List user-visible applications currently running on the OS."""
        apps: Dict[str, Dict[str, Any]] = {}

        for proc in psutil.process_iter(['name', 'exe', 'username', 'status', 'memory_info']):
            try:
                info = proc.info
                if not info.get('name'):
                    continue
                if info.get('status') in (psutil.STATUS_ZOMBIE, psutil.STATUS_DEAD):
                    continue

                raw_name = info['name']
                lower = raw_name.lower()
                if lower in IGNORE_PROCESSES:
                    continue

                mem = info.get('memory_info')
                if mem and getattr(mem, 'rss', 0) < 5 * 1024 * 1024:
                    continue

                username = (info.get('username') or '').upper()
                if platform.system().lower() == 'windows' and username.endswith('SYSTEM'):
                    if lower in IGNORE_PROCESSES or lower.startswith('svchost'):
                        continue

                display = normalize_app_name(raw_name, info.get('exe'))
                if display.lower() in ('unknown', ''):
                    continue

                key = display.lower()
                if key not in apps:
                    apps[key] = {
                        'app_name': display,
                        'process_count': 0,
                        'duration_minutes': 0,
                        'is_running': True,
                        'is_foreground': display == self._last_foreground_app,
                    }
                apps[key]['process_count'] += 1
                if display == self._last_foreground_app:
                    apps[key]['is_foreground'] = True
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue

        result = sorted(apps.values(), key=lambda a: (not a['is_foreground'], a['app_name'].lower()))
        return result

    def build_payload(self, active_window: str, idle_seconds: int = 0) -> Dict[str, Any]:
        """Tick, snapshot running apps, and return merged app_usage for upload."""
        self.tick(active_window, idle_seconds)
        foreground_usage = self.flush_usage()
        running = self.get_running_applications()

        usage_by_name = {u['app_name'].lower(): dict(u) for u in foreground_usage}
        for app in running:
            key = app['app_name'].lower()
            if key in usage_by_name:
                usage_by_name[key]['is_running'] = True
                usage_by_name[key]['process_count'] = app['process_count']
                usage_by_name[key]['is_foreground'] = app.get('is_foreground', False)
            else:
                usage_by_name[key] = {
                    'app_name': app['app_name'],
                    'duration_minutes': 0,
                    'is_running': True,
                    'process_count': app['process_count'],
                    'is_foreground': False,
                }

        merged = sorted(
            usage_by_name.values(),
            key=lambda x: (not x.get('is_foreground'), -x.get('duration_minutes', 0)),
        )

        return {
            'app_usage': merged,
            'running_apps': running,
            'running_app_count': len(running),
        }
