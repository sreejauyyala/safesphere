from sqlalchemy import Column, String, ForeignKey, Uuid, DateTime, Integer, Boolean, Text
from sqlalchemy.orm import relationship as orm_relationship
from app.models.base import TimeStampedUUIDModel


class Guardian(TimeStampedUUIDModel):
    """
    Guardian model linked to minor users (<18).
    Captures primary guardian details, verification status, and consent status.
    """
    __tablename__ = "guardians"

    minor_user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    guardian_name = Column(String(150), nullable=False)
    guardian_phone = Column(String(30), nullable=False)
    guardian_email = Column(String(255), nullable=True)
    relationship = Column(String(50), nullable=False)  # Parent, Guardian, Mother, Father, Other
    verification_status = Column(String(50), default="NOT_VERIFIED", nullable=False)  # NOT_VERIFIED, PENDING, VERIFIED, REJECTED
    consent_status = Column(String(50), default="PENDING", nullable=False)  # PENDING, ACCEPTED, DECLINED
    verification_otp = Column(String(10), nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    phone_verified = Column(Boolean, default=False, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    verified_delivery_method = Column(String(20), nullable=True)

    # Relationships
    minor_user = orm_relationship("User", back_populates="guardian")
    challenges = orm_relationship(
        "GuardianVerificationChallenge",
        back_populates="guardian",
        cascade="all, delete-orphan",
        order_by="desc(GuardianVerificationChallenge.created_at)"
    )


class GuardianVerificationChallenge(TimeStampedUUIDModel):
    """
    Dedicated entity for individual OTP verification challenges.
    Records single-use challenge hashes, carrier delivery status, attempts, and expiry.
    Protects against replay attacks and never persists plaintext OTPs.
    """
    __tablename__ = "guardian_verification_challenges"

    guardian_id = Column(Uuid(as_uuid=True), ForeignKey("guardians.id", ondelete="CASCADE"), nullable=False, index=True)
    minor_user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    phone_number = Column(String(30), nullable=True)
    delivery_method = Column(String(20), default="sms", nullable=False)  # "sms" or "email"
    destination = Column(String(255), nullable=False, default="")

    # Cryptographic verifier (HMAC-SHA256, NEVER plaintext)
    otp_hash = Column(String(128), nullable=False)
    otp_salt = Column(String(64), nullable=False)

    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    attempts_used = Column(Integer, default=0, nullable=False)
    max_attempts = Column(Integer, default=5, nullable=False)

    # State tracking
    is_consumed = Column(Boolean, default=False, nullable=False)
    consumed_at = Column(DateTime(timezone=True), nullable=True)
    is_superseded = Column(Boolean, default=False, nullable=False)

    # Provider & Delivery Status
    delivery_status = Column(String(50), default="PENDING", nullable=False)  # NOT_CONFIGURED, PENDING, REQUEST_ACCEPTED, SENT, DELIVERED, FAILED, EXPIRED, VERIFIED
    provider_name = Column(String(50), default="unconfigured", nullable=False)
    provider_reference = Column(String(120), nullable=True)
    provider_error = Column(Text, nullable=True)

    # Relationships
    guardian = orm_relationship("Guardian", back_populates="challenges")
    minor_user = orm_relationship("User")
