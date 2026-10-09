import os
import pytest
from app.core.config import settings

@pytest.fixture(autouse=True)
def enable_test_otp_mode():
    """
    Enables isolated dev/test verification mode for automated test suites by default,
    while individual tests can patch OTP_DEV_MODE to False to test production restrictions.
    """
    original = settings.OTP_DEV_MODE
    settings.OTP_DEV_MODE = True
    yield
    settings.OTP_DEV_MODE = original
