import os
import uuid
import logging
from pathlib import Path
from typing import Optional, Tuple
from fastapi import HTTPException, status
from app.core.config import settings

logger = logging.getLogger(__name__)

# Base directory for uploads
BASE_UPLOAD_DIR = Path(settings.UPLOAD_DIR).resolve()
IMAGES_DIR = BASE_UPLOAD_DIR / "images"
TEMP_AUDIO_DIR = BASE_UPLOAD_DIR / "temp_audio"

ALLOWED_IMAGE_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

ALLOWED_AUDIO_MIME_TYPES = {
    "audio/webm": ".webm",
    "audio/mp4": ".mp4",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/wave": ".wav",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/x-m4a": ".m4a",
    "audio/m4a": ".m4a",
    "audio/aac": ".aac",
}


class StorageService:
    """
    Storage abstraction service for SafeSphere multi-modal evidence.
    Manages secure local storage for development/MVP and provides a clean
    provider interface ready for Firebase Storage or cloud object store.
    """

    def __init__(self):
        # Automatically initialize upload directories
        try:
            IMAGES_DIR.mkdir(parents=True, exist_ok=True)
            TEMP_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.warning("Could not create storage directories: %s", e)

    def validate_file_size(self, size_bytes: int) -> None:
        """
        Validates that uploaded file does not exceed maximum allowed byte size.
        """
        if size_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
            max_mb = settings.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"Uploaded file exceeds maximum size limit of {int(max_mb)} MB.",
            )


    def validate_image_mime(self, content_type: str) -> str:
        """
        Validates image content type against allowed MIME whitelist.
        Returns mapped file extension.
        """
        clean_type = (content_type or "").split(";")[0].strip().lower()
        if clean_type not in ALLOWED_IMAGE_MIME_TYPES:
            allowed = ", ".join(sorted(set(ALLOWED_IMAGE_MIME_TYPES.keys())))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported image type '{content_type}'. Allowed types: {allowed}.",
            )
        return ALLOWED_IMAGE_MIME_TYPES[clean_type]

    def validate_audio_mime(self, content_type: str) -> str:
        """
        Validates audio content type against allowed MIME whitelist.
        Returns mapped file extension.
        """
        clean_type = (content_type or "").split(";")[0].strip().lower()
        if clean_type not in ALLOWED_AUDIO_MIME_TYPES:
            allowed = ", ".join(sorted(set(ALLOWED_AUDIO_MIME_TYPES.keys())))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported audio type '{content_type}'. Allowed types: {allowed}.",
            )
        return ALLOWED_AUDIO_MIME_TYPES[clean_type]

    def upload_image(
        self,
        file_bytes: bytes,
        content_type: str,
        original_filename: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        Securely writes image evidence bytes to storage.
        Returns tuple of (absolute_file_path, private_media_url).
        """
        self.validate_file_size(len(file_bytes))
        ext = self.validate_image_mime(content_type)
        safe_filename = f"{uuid.uuid4().hex}{ext}"
        target_path = IMAGES_DIR / safe_filename

        with open(target_path, "wb") as f:
            f.write(file_bytes)

        media_url = f"/api/v1/reports/media/images/{safe_filename}"
        logger.info("Stored safety image: %s (%d bytes)", safe_filename, len(file_bytes))
        return str(target_path), media_url

    def temporary_upload(
        self,
        file_bytes: bytes,
        content_type: str,
        original_filename: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        Stores voice recording temporarily for speech transcription and analysis.
        Returns tuple of (absolute_file_path, filename).
        """
        self.validate_file_size(len(file_bytes))
        ext = self.validate_audio_mime(content_type)
        safe_filename = f"{uuid.uuid4().hex}{ext}"
        target_path = TEMP_AUDIO_DIR / safe_filename

        with open(target_path, "wb") as f:
            f.write(file_bytes)

        logger.info("Stored temporary voice recording: %s (%d bytes)", safe_filename, len(file_bytes))
        return str(target_path), safe_filename

    def delete_temp_audio(self, file_path: str) -> bool:
        """
        Safely removes a temporary audio recording after speech processing.
        Guards against directory traversal by verifying path ancestry.
        """
        try:
            p = Path(file_path).resolve()
            if TEMP_AUDIO_DIR in p.parents or p.parent == TEMP_AUDIO_DIR:
                if p.exists():
                    p.unlink()
                    logger.info("Cleaned up temporary audio: %s", p.name)
                    return True
            return False
        except Exception as e:
            logger.warning("Error deleting temporary audio %s: %s", file_path, e)
            return False

    def delete_file(self, file_path: str) -> bool:
        """
        Safely removes a stored evidence file.
        Guards against directory traversal by verifying path ancestry.
        """
        try:
            p = Path(file_path).resolve()
            if BASE_UPLOAD_DIR in p.parents or p.parent == BASE_UPLOAD_DIR:
                if p.exists():
                    p.unlink()
                    logger.info("Deleted stored evidence file: %s", p.name)
                    return True
            return False
        except Exception as e:
            logger.warning("Error deleting file %s: %s", file_path, e)
            return False

    def get_private_file_url(self, file_path: str) -> str:
        """
        Constructs private media URL for an evidence file path.
        """
        p = Path(file_path)
        return f"/api/v1/reports/media/images/{p.name}"


storage_service = StorageService()
