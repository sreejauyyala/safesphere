from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.ai_analysis import (
    AIAnalysisRequest,
    AIAnalysisEnvelope,
    AITranscriptionEnvelope,
    AIAudioAnalysisEnvelope,
    AIImageAnalysisEnvelope,
)
from app.services.report_service import report_service
from app.services.audio_service import audio_service
from app.services.image_service import image_service

router = APIRouter()


@router.post(
    "/analyze-report",
    response_model=AIAnalysisEnvelope,
    summary="Analyze incident report description with Gemini AI",
)
async def analyze_report(
    payload: AIAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Analyzes safety report observations using Gemini AI structured classification.
    Returns category, severity, summary, signal, and confidence suggestions.
    """
    return await report_service.analyze_report_text(
        db=db,
        current_user=current_user,
        description=payload.description,
    )


@router.post(
    "/transcribe-audio",
    response_model=AITranscriptionEnvelope,
    summary="Transcribe voice recording for safety report",
)
async def transcribe_audio_endpoint(
    file: UploadFile = File(..., description="Audio recording file (WebM, WAV, MP4, MP3, OGG)"),
    current_user: User = Depends(get_current_user),
):
    """
    Transcribes audio recording using SafeSphere Gemini speech processing.
    """
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty audio recording submitted.",
        )
    return await audio_service.transcribe_voice(
        file_bytes=file_bytes,
        content_type=file.content_type or "audio/webm",
        filename=file.filename,
    )


@router.post(
    "/analyze-audio",
    response_model=AIAudioAnalysisEnvelope,
    summary="Analyze voice report with SafeSphere Gemini AI",
)
async def analyze_audio_endpoint(
    file: UploadFile = File(..., description="Audio recording file"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Transcribes voice recording and performs structured safety analysis.
    """
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty audio recording submitted.",
        )
    return await audio_service.analyze_voice_report(
        db=db,
        current_user=current_user,
        file_bytes=file_bytes,
        content_type=file.content_type or "audio/webm",
        filename=file.filename,
    )


@router.post(
    "/analyze-image",
    response_model=AIImageAnalysisEnvelope,
    summary="Analyze image evidence with Gemini AI",
)
async def analyze_image_endpoint(
    file: UploadFile = File(..., description="Image evidence file (JPEG, PNG, WebP)"),
    description: Optional[str] = Form(None, description="Optional accompanying observation description"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Analyzes visual safety evidence with optional citizen text description.
    """
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty image file submitted.",
        )
    return await image_service.analyze_image_report(
        db=db,
        current_user=current_user,
        file_bytes=file_bytes,
        content_type=file.content_type or "image/jpeg",
        description=description,
        filename=file.filename,
    )

