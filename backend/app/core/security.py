import os
import json
import base64
import logging
from typing import Optional, Dict, Any
import jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

logger = logging.getLogger("safesphere.auth")
security_bearer = HTTPBearer(auto_error=False)


def decode_token_payload(token: str) -> Dict[str, Any]:
    """
    Decodes an authentication token from client.
    Supports Firebase ID tokens, standard JWTs, and dev test tokens.
    """
    # 1. Dev test token format: dev-token-<uid> or test:<uid>
    if token.startswith("dev-token-") or token.startswith("test-"):
        uid = token.replace("dev-token-", "").replace("test-", "")
        return {
            "uid": uid,
            "sub": uid,
            "email": f"{uid}@safesphere.local",
            "firebase": {"sign_in_provider": "dev_test"}
        }

    # 2. Check if Firebase Admin SDK is configured
    if settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
        try:
            import firebase_admin
            from firebase_admin import auth as firebase_auth
            decoded = firebase_auth.verify_id_token(token)
            return decoded
        except Exception as e:
            logger.warning(f"Firebase Admin SDK verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Firebase ID token: {str(e)}"
            )

    # 3. Standard JWT / Development decode without strict signature check when cert not loaded
    try:
        # Decode without verification if public keys aren't cached locally
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        uid = unverified_payload.get("user_id") or unverified_payload.get("uid") or unverified_payload.get("sub")
        if not uid:
            raise ValueError("Token does not contain a valid user identity (uid/sub).")
        return unverified_payload
    except Exception as e:
        logger.debug(f"JWT decode fallback attempt: {e}")
        # Try raw base64 json decode for mock client tokens
        try:
            parts = token.split(".")
            if len(parts) >= 2:
                padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
                data = json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
                return data
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials: invalid token structure."
        )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency that extracts and validates the authenticated user from bearer token.
    Maps Firebase UID to PostgreSQL User entity.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_token_payload(token)
    firebase_uid = payload.get("user_id") or payload.get("uid") or payload.get("sub")

    if not firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token payload.",
        )

    user = db.query(User).filter(User.firebase_uid == str(firebase_uid)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SafeSphere user profile not found. Complete user registration first.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive or suspended.",
        )

    return user


def require_role(*allowed_roles: str):
    """
    Role-based authorization dependency factory.
    Example: Depends(require_role("SYSTEM_ADMIN", "ORGANIZATION_ADMIN"))
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {allowed_roles} role permissions."
            )
        return current_user
    return role_checker
