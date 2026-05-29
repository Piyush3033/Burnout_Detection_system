"""
Data upload module for sending collected data to the backend
"""

import logging
import requests
import json
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class DataUploader:
    """Handles uploading collected data to the backend"""
    
    def __init__(self, api_url: str, user_token: str):
        self.api_url = api_url
        self.user_token = user_token

        if not self.api_url:
            raise ValueError('API_URL must be set to the backend base URL')
        if not self.user_token or self.user_token.lower().startswith('your_jwt'):
            raise ValueError('USER_TOKEN must be set to a valid JWT')

        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {user_token}',
            'Content-Type': 'application/json',
        })
        
        logger.info(f'DataUploader initialized for {api_url}')
    
    def upload(self, data: Dict[str, Any]) -> bool:
        """
        Upload activity data to backend
        
        Args:
            data: Dictionary containing activity and system data
            
        Returns:
            bool: True if upload successful, False otherwise
        """
        try:
            endpoint = f'{self.api_url}/api/activity/log'
            
            response = self.session.post(
                endpoint,
                json=data,
                timeout=10
            )
            
            status_code = int(response.status_code)
            logger.warning(
                f'Upload response: status={status_code}, reason={response.reason}, ' \
                f'text={response.text!r}'
            )
            
            if response.ok:
                logger.info('Data uploaded successfully')
                return True
            elif status_code == 401:
                logger.error('Authentication failed - invalid token')
                return False
            else:
                logger.warning(
                    f'Upload failed with status {status_code} and body: {response.text}'
                )
                return False
                
        except requests.ConnectionError:
            logger.warning('Connection error - will retry on next cycle')
            return False
        except requests.Timeout:
            logger.warning('Request timeout - will retry on next cycle')
            return False
        except Exception as e:
            logger.error(f'Error uploading data: {str(e)}')
            return False
    
    def upload_batch(self, data_list: list) -> bool:
        """
        Upload multiple data points in batch
        
        Args:
            data_list: List of data dictionaries
            
        Returns:
            bool: True if upload successful
        """
        try:
            endpoint = f'{self.api_url}/api/activity/batch'
            
            response = self.session.post(
                endpoint,
                json={'entries': data_list},
                timeout=15
            )
            
            status_code = int(response.status_code)
            if 200 <= status_code < 300:
                logger.info(f'Batch upload successful - {len(data_list)} entries')
                return True
            else:
                logger.warning(
                    f'Batch upload failed with status {status_code} and body: {response.text}'
                )
                return False
                
        except Exception as e:
            logger.error(f'Error during batch upload: {str(e)}')
            return False
    
    def check_connection(self) -> bool:
        """
        Check if agent can connect to backend
        
        Returns:
            bool: True if connection successful
        """
        try:
            endpoint = f'{self.api_url}/health'
            response = self.session.get(endpoint, timeout=5)
            return response.status_code == 200
        except Exception:
            return False
