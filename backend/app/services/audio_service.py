import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.safety_report_ai_analysis import SafetyReportAIAnalysis
from app.services.storage_service import storage_service
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)


class AudioSafetyService:
    """
    Coordinates speech recording validation, temporary storage,
    Gemini speech-to-text transcription, and audio safety analysis.
    Ensures temporary audio files are strictly cleaned up after processing.
    """

    async def transcribe_voice(
        self,
        file_bytes: bytes,
        content_type: str,
        filename: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Transcribes a voice recording file to plain text.
        Guarantees cleanup of temporary recording file.
        """
        temp_path, _ = storage_service.temporary_upload(
            file_bytes=file_bytes,
            content_type=content_type,
            original_filename=filename,
        )

        try:
            result = await gemini_service.transcribe_audio(
                audio_bytes=file_bytes,
                mime_type=content_type,
            )
            return result
        finally:
            storage_service.delete_temp_audio(temp_path)

    async def analyze_voice_report(
        self,
        db: Session,
        current_user: User,
        file_bytes: bytes,
        content_type: str,
        filename: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Performs end-to-end voice reporting safety analysis:
        1. Validates and saves audio temporarily.
        2. Transcribes and classifies safety hazard using Gemini.
        3. Audits the AI suggestion in the database for accuracy tracking.
        4. Cleans up temporary raw audio file.
        """
        temp_path, _ = storage_service.temporary_upload(
            file_bytes=file_bytes,
            content_type=content_type,
            original_filename=filename,
        )

        try:
            result = await gemini_service.analyze_safety_audio(
                audio_bytes=file_bytes,
                mime_type=content_type,
            )

            if result.get("success") and result.get("analysis"):
                try:
                    analysis_data = result["analysis"]
                    transcript = result.get("transcript", "")
                    ai_record = SafetyReportAIAnalysis(
                        user_id=current_user.id,
                        report_id=None,
                        input_text=f"[Voice Transcript] {transcript}".strip(),
                        suggested_category=analysis_data.get("category", "other"),
                        suggested_severity=analysis_data.get("severity", "medium"),
                        summary=analysis_data.get("summary", ""),
                        safety_signal=analysis_data.get("safety_signal", "general_safety"),
                        confidence=float(analysis_data.get("confidence", 0.5)),
                        suggested_action=analysis_data.get("suggested_action"),
                        model_name=gemini_service.model_name,
                    )
                    db.add(ai_record)
                    db.commit()
                except Exception as e:
                    logger.warning("Could not persist AI analysis audit record: %s", e)
                    db.rollback()

            return result
        finally:
            storage_service.delete_temp_audio(temp_path)


audio_service = AudioSafetyService()
