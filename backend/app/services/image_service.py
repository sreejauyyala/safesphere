import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.safety_report_ai_analysis import SafetyReportAIAnalysis
from app.services.storage_service import storage_service
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)


class ImageSafetyService:
    """
    Coordinates visual evidence validation, secure image storage,
    Gemini multimodal visual safety analysis, and audit persistence.
    """

    async def analyze_image_report(
        self,
        db: Session,
        current_user: User,
        file_bytes: bytes,
        content_type: str,
        description: Optional[str] = None,
        filename: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Processes uploaded visual safety evidence:
        1. Stores image securely in the upload directory.
        2. Dispatches multimodal analysis to Gemini AI with optional observation description.
        3. Audits the AI suggestions in the database.
        4. Returns normalized AI analysis along with private media URL.
        """
        # Store evidence photo securely
        file_path, media_url = storage_service.upload_image(
            file_bytes=file_bytes,
            content_type=content_type,
            original_filename=filename,
        )

        # Multimodal analysis via Gemini AI
        result = await gemini_service.analyze_safety_image(
            image_bytes=file_bytes,
            mime_type=content_type,
            description=description,
        )

        # Attach stored media URL to result
        result["media_url"] = media_url

        if result.get("success") and result.get("analysis"):
            try:
                analysis_data = result["analysis"]
                input_desc = f"[Image Evidence: {media_url}]"
                if description and description.strip():
                    input_desc += f" Citizen Note: {description.strip()}"

                ai_record = SafetyReportAIAnalysis(
                    user_id=current_user.id,
                    report_id=None,
                    input_text=input_desc,
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
                logger.warning("Could not persist AI analysis audit record for image: %s", e)
                db.rollback()

        return result


image_service = ImageSafetyService()
