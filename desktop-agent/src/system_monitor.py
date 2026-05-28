"""
System monitoring module for tracking system health and resources
"""

import logging
import psutil
import platform
from typing import Dict, Any

logger = logging.getLogger(__name__)


class SystemMonitor:
    """Monitors system resources and health"""
    
    def __init__(self):
        self.start_memory = psutil.virtual_memory().available
        logger.info('SystemMonitor initialized')
    
    def get_system_health(self) -> Dict[str, Any]:
        """
        Get comprehensive system health report
        
        Returns:
            Dictionary with system metrics
        """
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_available_mb': memory.available / (1024 * 1024),
                'disk_percent': disk.percent,
                'disk_available_gb': disk.free / (1024 * 1024 * 1024),
            }
        except Exception as e:
            logger.error(f'Error getting system health: {str(e)}')
            return {}
    
    def get_system_info(self) -> Dict[str, Any]:
        """
        Get static system information
        
        Returns:
            Dictionary with system info
        """
        try:
            return {
                'platform': platform.system(),
                'platform_version': platform.version(),
                'processor': platform.processor(),
                'cpu_count': psutil.cpu_count(),
                'memory_total_gb': psutil.virtual_memory().total / (1024 * 1024 * 1024),
            }
        except Exception as e:
            logger.error(f'Error getting system info: {str(e)}')
            return {}
    
    def check_resource_warning(self) -> Dict[str, bool]:
        """
        Check if any resource usage is at warning levels
        
        Returns:
            Dictionary with warning flags
        """
        try:
            memory = psutil.virtual_memory()
            cpu_percent = psutil.cpu_percent(interval=0.1)
            
            return {
                'high_cpu': cpu_percent > 80,
                'high_memory': memory.percent > 85,
                'low_disk': psutil.disk_usage('/').percent > 90,
                'memory_pressure': memory.percent > 75,
            }
        except Exception as e:
            logger.error(f'Error checking resource warnings: {str(e)}')
            return {}
    
    def get_agent_stats(self) -> Dict[str, Any]:
        """
        Get agent process statistics
        
        Returns:
            Dictionary with agent stats
        """
        try:
            import os
            current_process = psutil.Process(os.getpid())
            
            return {
                'agent_cpu_percent': current_process.cpu_percent(interval=0.1),
                'agent_memory_mb': current_process.memory_info().rss / (1024 * 1024),
                'agent_memory_percent': current_process.memory_percent(),
            }
        except Exception as e:
            logger.error(f'Error getting agent stats: {str(e)}')
            return {}
