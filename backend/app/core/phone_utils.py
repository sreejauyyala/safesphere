import re
from typing import Optional


def normalize_phone_number(raw_phone: str) -> str:
    """
    Normalizes a phone number to standard E.164 format.

    Handles:
    - Standard international format (e.g., +15551234567, +447911123456).
    - Indian numbers in various national formats:
        - 10 digits starting with [6-9] -> +91XXXXXXXXXX
        - 11 digits starting with 0[6-9] -> +91XXXXXXXXXX
        - 12 digits starting with 91[6-9] -> +91XXXXXXXXXX
        - Explicit +91 with 10 digits -> +91XXXXXXXXXX (avoids duplicate +91 prepend)
    - Rejects invalid formats, non-numeric characters (other than leading +),
      or numbers that are too short/long under ITU E.164 rules.
    """
    if not raw_phone or not isinstance(raw_phone, str):
        raise ValueError("Phone number must be a non-empty string.")

    cleaned = raw_phone.strip()

    # Check for international 00 prefix (e.g., 0091 -> +91)
    if cleaned.startswith("00"):
        cleaned = "+" + cleaned[2:]

    has_plus = cleaned.startswith("+")
    digits_only = re.sub(r"\D", "", cleaned)

    if not digits_only:
        raise ValueError("Phone number contains no numeric digits.")

    # Reject if unexpected characters (other than +, spaces, hyphens, parens)
    valid_chars_pattern = r"^[\+\d\s\-\(\)\.]+$"
    if not re.match(valid_chars_pattern, cleaned):
        raise ValueError("Phone number contains invalid characters.")

    # --- Case 1: Explicit leading '+' ---
    if has_plus:
        # Check if Indian number (+91)
        if digits_only.startswith("91"):
            indian_national = digits_only[2:]
            if len(indian_national) != 10:
                raise ValueError(
                    f"Indian phone numbers must contain exactly 10 national digits (received {len(indian_national)})."
                )
            if indian_national[0] not in ("6", "7", "8", "9"):
                raise ValueError(
                    "Indian mobile numbers must begin with 6, 7, 8, or 9."
                )
            return f"+91{indian_national}"

        # Standard international number
        if len(digits_only) < 7 or len(digits_only) > 15:
            raise ValueError(
                f"International phone numbers must contain between 7 and 15 digits (received {len(digits_only)})."
            )
        return f"+{digits_only}"

    # --- Case 2: No leading '+' ---
    # 2a: Indian 10-digit mobile (e.g. 9876543210)
    if len(digits_only) == 10 and digits_only[0] in ("6", "7", "8", "9"):
        return f"+91{digits_only}"

    # 2b: Indian 11-digit with trunk zero (e.g. 09876543210)
    if len(digits_only) == 11 and digits_only.startswith("0") and digits_only[1] in ("6", "7", "8", "9"):
        return f"+91{digits_only[1:]}"

    # 2c: Indian 12-digit without '+' (e.g. 919876543210)
    if len(digits_only) == 12 and digits_only.startswith("91") and digits_only[2] in ("6", "7", "8", "9"):
        return f"+91{digits_only[2:]}"

    # 2d: US/NANP 10-digit or 11-digit (e.g. 15551234567 or 5551234567)
    if len(digits_only) == 11 and digits_only.startswith("1"):
        return f"+{digits_only}"

    if len(digits_only) == 10:
        # Defaulting 10 digits starting with 1 to +1
        if digits_only.startswith("1"):
            return f"+1{digits_only}"
        # For other 10-digit numbers where country code was omitted
        # If it doesn't match Indian mobile [6-9], reject ambiguity to prevent wrong country SMS
        raise ValueError(
            "Country code is required for non-Indian phone numbers. Please include '+' and country code (e.g. +1 5551234567)."
        )

    # General fallback for raw digits between 11 and 15 digits with leading country code
    if 11 <= len(digits_only) <= 15:
        return f"+{digits_only}"

    raise ValueError(
        f"Invalid or incomplete phone number format: '{raw_phone}'. Please include country code (e.g. +91 9876543210)."
    )


def mask_phone_number(phone: Optional[str]) -> str:
    """
    Masks a normalized phone number for safe display in UI and logs.
    Example: '+919876543210' -> '+91 ******3210'
             '+15551234567'  -> '+1 ******4567'
    """
    if not phone:
        return "Unknown"

    cleaned = phone.strip()
    digits = re.sub(r"\D", "", cleaned)

    if len(digits) < 6:
        return f"+{'*' * len(digits)}"

    # Determine country code length
    if cleaned.startswith("+91") or digits.startswith("91") and len(digits) == 12:
        country_prefix = "+91"
        national = digits[-10:]
        last4 = national[-4:]
        return f"{country_prefix} ******{last4}"
    elif cleaned.startswith("+1") or digits.startswith("1") and len(digits) == 11:
        country_prefix = "+1"
        national = digits[-10:]
        last4 = national[-4:]
        return f"{country_prefix} ******{last4}"
    else:
        # General country prefix
        last4 = digits[-4:]
        prefix = cleaned[:3] if cleaned.startswith("+") else f"+{digits[:2]}"
        return f"{prefix} ******{last4}"


def is_valid_phone(raw_phone: str) -> bool:
    """Convenience helper returning True if normalized successfully."""
    try:
        normalize_phone_number(raw_phone)
        return True
    except (ValueError, TypeError):
        return False


def mask_email(email: Optional[str]) -> str:
    """
    Masks an email address for safe display in UI and logs.
    Example: 'victor@gmail.com' -> 'v******@gmail.com'
             'contact.safesphere@domain.org' -> 'c******@domain.org'
    """
    if not email or "@" not in email:
        return "Unknown"

    cleaned = email.strip()
    try:
        parts = cleaned.split("@", 1)
        local_part = parts[0]
        domain = parts[1]

        if not local_part:
            return f"******@{domain}"

        first_char = local_part[0]
        return f"{first_char}******@{domain}"
    except Exception:
        return "Unknown"


def is_valid_email(raw_email: Optional[str]) -> bool:
    """Convenience helper returning True if email is non-empty and well-formed."""
    if not raw_email or not isinstance(raw_email, str):
        return False
    email_pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return bool(re.match(email_pattern, raw_email.strip()))


def mask_destination(destination: Optional[str], delivery_method: str = "sms") -> str:
    """
    Masks either a phone number or an email depending on the delivery channel or format.
    """
    if not destination:
        return "Unknown"
    cleaned = destination.strip()
    if delivery_method.lower() == "email" or "@" in cleaned:
        return mask_email(cleaned)
    return mask_phone_number(cleaned)

