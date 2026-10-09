import secrets
import hmac
import hashlib
from typing import Tuple

from app.core.config import settings


def generate_secure_otp() -> str:
    """
    Generates a cryptographically secure 6-digit numeric OTP.
    Preserves leading zeros using Python's secrets module (e.g., '004921').
    """
    code = secrets.randbelow(1_000_000)
    return f"{code:06d}"


def generate_salt() -> str:
    """Generates a random cryptographic salt for OTP keyed hashing."""
    return secrets.token_hex(16)


def hash_otp(otp_code: str, salt: str, secret_key: str = "") -> str:
    """
    Computes a server-side keyed HMAC-SHA256 hash of the OTP verifier.
    Plaintext OTPs are never stored directly in the database.
    """
    key_material = secret_key or settings.JWT_SECRET_KEY
    key = f"{key_material}:{salt}".encode("utf-8")
    return hmac.new(key, otp_code.strip().encode("utf-8"), hashlib.sha256).hexdigest()


def verify_otp_hash(entered_otp: str, salt: str, expected_hash: str, secret_key: str = "") -> bool:
    """
    Verifies an entered OTP code against the stored keyed hash using
    constant-time comparison to prevent timing attacks.
    """
    computed = hash_otp(entered_otp, salt, secret_key)
    return hmac.compare_digest(computed, expected_hash)


def format_otp_message(otp_code: str, expiry_seconds: int = 300) -> str:
    """
    Formats the user-facing SMS message per SafeSphere specification.
    """
    minutes = max(1, round(expiry_seconds / 60))
    return (
        f"SafeSphere verification code: {otp_code}. "
        f"This code expires in {minutes} minutes. "
        f"Do not share it with anyone."
    )


def format_otp_email(otp_code: str, expiry_seconds: int = 300) -> Tuple[str, str, str]:
    """
    Formats the user-facing email notification per SafeSphere specification.
    Returns (subject, text_body, html_body).
    """
    minutes = max(1, round(expiry_seconds / 60))
    subject = "SafeSphere — Guardian Verification Code"
    text_body = (
        f"Your SafeSphere verification code is {otp_code}.\n\n"
        f"This code expires in {minutes} minutes.\n\n"
        f"If you did not request this code, you can ignore this email. Do not share the code with anyone."
    )
    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SafeSphere Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px; margin: 0;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #111827; border-radius: 16px; padding: 28px; border: 1px solid #1f2937;">
    <div style="display: flex; align-items: center; margin-bottom: 20px;">
      <h2 style="color: #a855f7; margin: 0; font-size: 20px;">SafeSphere Guardian Verification</h2>
    </div>
    <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
      Your guardian verification code is:
    </p>
    <div style="background-color: #030712; border: 1px solid #7c3aed; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px;">
      <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #38bdf8;">{otp_code}</span>
    </div>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 12px;">
      This code expires in <strong>{minutes} minutes</strong>.
    </p>
    <p style="color: #64748b; font-size: 12px; line-height: 1.5; border-top: 1px solid #1f2937; padding-top: 16px; margin-top: 24px;">
      If you did not request this code, you can ignore this email. Do not share the code with anyone.
    </p>
  </div>
</body>
</html>"""
    return subject, text_body, html_body
