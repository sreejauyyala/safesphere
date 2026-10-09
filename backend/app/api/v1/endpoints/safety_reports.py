from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.safety_report import SafetyReport
from app.models.user import User
from app.schemas.safety_report import SafetyReportCreateRequest, SafetyReportResponse
from app.services.report_service import report_service
from app.services.map_seed import seed_dev_map_data

router = APIRouter()


@router.post("", response_model=SafetyReportResponse, status_code=status.HTTP_201_CREATED)
def create_safety_report(
    payload: SafetyReportCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return report_service.create_report(db=db, current_user=current_user, data=payload)


@router.get("")
def list_safety_reports(db: Session = Depends(get_db)):
    if db.query(SafetyReport).count() == 0:
        seed_dev_map_data(db)

    reports = db.query(SafetyReport).order_by(SafetyReport.created_at.desc()).all()
    # Strip private identity to preserve privacy
    items = []
    for r in reports:
        items.append({
            "id": str(r.id),
            "category": r.category,
            "title": r.title,
            "description": r.description,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "severity": r.severity,
            "status": r.status,
            "verification_status": r.verification_status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {
        "status": "success",
        "count": len(items),
        "reports": items,
    }
