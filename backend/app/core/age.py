from datetime import date
from typing import Tuple
from fastapi import HTTPException, status


def calculate_age(date_of_birth: date) -> int:
    """
    Accurately calculates age from date of birth taking calendar days into account.
    """
    today = date.today()
    return today.year - date_of_birth.year - (
        (today.month, today.day) < (date_of_birth.month, date_of_birth.day)
    )


def validate_and_evaluate_dob(date_of_birth: date) -> Tuple[int, bool]:
    """
    Validates date of birth against boundary constraints and evaluates minor status (<18).
    Returns (age, is_minor).
    Raises HTTPException 400 for impossible dates.
    """
    today = date.today()

    if date_of_birth > today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Date of birth cannot be in the future."
        )

    age = calculate_age(date_of_birth)

    if age > 120:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unrealistic date of birth: age cannot exceed 120 years."
        )

    if age < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date of birth provided."
        )

    is_minor = (age < 18)
    return age, is_minor
