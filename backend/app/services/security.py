"""Security service for authentication and authorization."""

import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Tuple
from jose import jwt, JWTError
import bcrypt

from app.config import get_settings

settings = get_settings()


class SecurityService:
    """
    Service for handling authentication security operations.

    Provides:
    - Password hashing and verification (bcrypt)
    - JWT token creation and validation
    - API key generation and validation
    """

    # JWT Configuration
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    REFRESH_TOKEN_EXPIRE_DAYS = 7

    # API Key Configuration
    API_KEY_PREFIX = "xeeno_"
    API_KEY_LENGTH = 32  # Length of random part

    @classmethod
    def hash_password(cls, password: str) -> str:
        """
        Hash a password using bcrypt.

        Args:
            password: Plain text password

        Returns:
            Hashed password string
        """
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode('utf-8')

    @classmethod
    def verify_password(cls, plain_password: str, hashed_password: str) -> bool:
        """
        Verify a password against its hash.

        Args:
            plain_password: Plain text password to verify
            hashed_password: Hashed password to compare against

        Returns:
            True if password matches, False otherwise
        """
        try:
            password_bytes = plain_password.encode('utf-8')
            hashed_bytes = hashed_password.encode('utf-8')
            return bcrypt.checkpw(password_bytes, hashed_bytes)
        except Exception:
            return False

    @classmethod
    def create_access_token(
        cls,
        user_id: str,
        role: str,
        email: str,
        expires_delta: Optional[timedelta] = None,
    ) -> str:
        """
        Create a JWT access token.

        Args:
            user_id: User's UUID as string
            role: User's role
            email: User's email
            expires_delta: Optional custom expiration time

        Returns:
            Encoded JWT token string
        """
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=cls.ACCESS_TOKEN_EXPIRE_MINUTES)

        to_encode = {
            "sub": user_id,
            "role": role,
            "email": email,
            "type": "access",
            "exp": expire,
            "iat": datetime.utcnow(),
        }

        return jwt.encode(to_encode, settings.secret_key, algorithm=cls.ALGORITHM)

    @classmethod
    def create_refresh_token(cls, user_id: str) -> str:
        """
        Create a JWT refresh token.

        Refresh tokens are longer-lived and used to obtain new access tokens.

        Args:
            user_id: User's UUID as string

        Returns:
            Encoded JWT refresh token string
        """
        expire = datetime.utcnow() + timedelta(days=cls.REFRESH_TOKEN_EXPIRE_DAYS)

        to_encode = {
            "sub": user_id,
            "type": "refresh",
            "exp": expire,
            "iat": datetime.utcnow(),
        }

        return jwt.encode(to_encode, settings.secret_key, algorithm=cls.ALGORITHM)

    @classmethod
    def decode_token(cls, token: str) -> Optional[dict]:
        """
        Decode and validate a JWT token.

        Args:
            token: JWT token string

        Returns:
            Decoded token payload or None if invalid
        """
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[cls.ALGORITHM])
            return payload
        except JWTError:
            return None

    @classmethod
    def verify_access_token(cls, token: str) -> Optional[dict]:
        """
        Verify an access token and return its payload.

        Args:
            token: JWT access token

        Returns:
            Token payload if valid access token, None otherwise
        """
        payload = cls.decode_token(token)
        if payload and payload.get("type") == "access":
            return payload
        return None

    @classmethod
    def verify_refresh_token(cls, token: str) -> Optional[str]:
        """
        Verify a refresh token and return the user_id.

        Args:
            token: JWT refresh token

        Returns:
            User ID if valid refresh token, None otherwise
        """
        payload = cls.decode_token(token)
        if payload and payload.get("type") == "refresh":
            return payload.get("sub")
        return None

    @classmethod
    def generate_api_key(cls) -> Tuple[str, str]:
        """
        Generate a new API key and its hash.

        The full key is returned for display to the user (only once).
        The hash should be stored in the database.

        Returns:
            Tuple of (full_key, key_hash)
        """
        # Generate random bytes and convert to hex
        random_part = secrets.token_hex(cls.API_KEY_LENGTH)
        full_key = f"{cls.API_KEY_PREFIX}{random_part}"

        # Hash the key for storage
        key_hash = cls.hash_api_key(full_key)

        return full_key, key_hash

    @classmethod
    def hash_api_key(cls, api_key: str) -> str:
        """
        Hash an API key for secure storage.

        Uses SHA-256 for fast lookup while remaining secure.

        Args:
            api_key: The full API key

        Returns:
            Hashed API key
        """
        return hashlib.sha256(api_key.encode()).hexdigest()

    @classmethod
    def verify_api_key(cls, api_key: str, stored_hash: str) -> bool:
        """
        Verify an API key against its stored hash.

        Args:
            api_key: The API key to verify
            stored_hash: The hash stored in the database

        Returns:
            True if the key matches, False otherwise
        """
        return cls.hash_api_key(api_key) == stored_hash

    @classmethod
    def get_api_key_prefix(cls, api_key: str) -> str:
        """
        Extract the prefix from an API key for identification.

        Args:
            api_key: The full API key

        Returns:
            The key prefix (first 12 characters)
        """
        return api_key[:12] if len(api_key) >= 12 else api_key

    @classmethod
    def get_access_token_expire_seconds(cls) -> int:
        """Get access token expiration time in seconds."""
        return cls.ACCESS_TOKEN_EXPIRE_MINUTES * 60
