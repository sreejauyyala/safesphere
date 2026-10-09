from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.admin_service import admin_service
from app.schemas.admin import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationDetailResponse,
    OrganizationMembershipCreate,
    OrganizationMembershipResponse,
)

router = APIRouter()


@router.get(
    "/me",
    response_model=OrganizationDetailResponse,
    summary="Get authenticated administrator's assigned organization",
)
def get_my_organization(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_scope = admin_service.get_user_organization_scope(current_user, db)
    if not user_scope:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="System Administrator has global scope without a single assigned organization. Use /organizations to select.",
        )
    return admin_service.get_organization_detail(current_user, user_scope, db)


@router.get(
    "",
    response_model=List[OrganizationDetailResponse],
    summary="List organizations in scope",
)
def list_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return admin_service.list_organizations(current_user, db)


@router.post(
    "",
    response_model=OrganizationDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new organization (System Admin only)",
)
def create_organization(
    payload: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return admin_service.create_organization(current_user, payload, db)


@router.get(
    "/{org_id}",
    response_model=OrganizationDetailResponse,
    summary="Get organization profile details",
)
def get_organization_by_id(
    org_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return admin_service.get_organization_detail(current_user, org_id, db)


@router.patch(
    "/{org_id}",
    response_model=OrganizationDetailResponse,
    summary="Update organization profile and settings",
)
def update_organization_by_id(
    org_id: UUID,
    payload: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return admin_service.update_organization(current_user, org_id, payload, db)


@router.post(
    "/{org_id}/members",
    response_model=OrganizationMembershipResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add user to organization membership",
)
def add_organization_member_endpoint(
    org_id: UUID,
    payload: OrganizationMembershipCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return admin_service.add_organization_member(current_user, org_id, payload, db)
