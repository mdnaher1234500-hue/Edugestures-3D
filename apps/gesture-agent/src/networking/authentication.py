import logging
import requests
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class AgentAuthenticator:
    def __init__(self, api_url: str):
        self.api_url = api_url.rstrip("/")

    def authenticate(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Authenticate with NestJS API.
        Verifies credentials and ensures user has TEACHER or ADMIN role.
        Returns auth payload with accessToken and user dict.
        """
        login_url = f"{self.api_url}/auth/login"
        logger.info(f"Authenticating teacher '{email}' with {login_url}...")

        try:
            response = requests.post(
                login_url,
                json={"email": email, "password": password},
                headers={"Content-Type": "application/json"},
                timeout=5.0
            )

            if response.status_code != 200 and response.status_code != 201:
                logger.error(f"Authentication failed ({response.status_code}): {response.text}")
                return None

            data = response.json()
            user = data.get("user", {})
            role = user.get("role")

            if role not in ["TEACHER", "ADMIN"]:
                logger.error(f"Unauthorized role: '{role}'. Only TEACHER or ADMIN can control gestures.")
                return None

            logger.info(f"Authenticated successfully as {user.get('name')} ({role})")
            return data

        except requests.RequestException as e:
            logger.error(f"Network error connecting to API auth endpoint: {e}")
            return None
