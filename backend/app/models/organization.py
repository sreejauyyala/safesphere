from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedUUIDModel


class Organization(TimeStampedUUIDModel):
    """
    Organization model representing corporate campuses, universities, colleges, and community boards.
    """
    __tablename__ = "organizations"

    name = Column(String(200), nullable=False)
    org_type = Column(String(50), nullable=False)  # college, university, company, community_board, ngo
    domain = Column(String(100), unique=True, index=True, nullable=True)
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(30), nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Relationships
    issue_resolutions = relationship("IssueResolution", back_populates="assigned_organization")
