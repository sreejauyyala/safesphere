import io
import os
from pathlib import Path
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

# pyrefly: ignore [missing-import]
from app.main import app
from app.core.database import init_db
from app.models.safety_report import SafetyReport
from app.models.safety_report_ai_analysis import SafetyReportAIAnalysis
from app.schemas.ai_analysis import SafetyReportAIAnalysisResult
from app.services.storage_service import storage_service, TEMP_AUDIO_DIR, IMAGES_DIR

init_db()
client = TestClient(app)

TEST_USER = {
    "firebase_uid": "test_step8_multimodal_user_01",
    "full_name": "Aarav Patel",
    "email": "aarav.multimodal@example.com",
    "phone": "+919876543230",
    "date_of_birth": "1999-06-15",
    "user_type": "General Public",
}

AUTH_HEADERS = {"Authorization": f"Bearer dev-token-{TEST_USER['firebase_uid']}"}


@pytest.fixture(scope="module", autouse=True)
def setup_user():
    """Register test user in database."""
    client.post("/api/v1/auth/register", json=TEST_USER)


# ==============================================================================
# 1. SECURITY & AUTHENTICATION TESTS
# ==============================================================================

def test_unauthenticated_audio_endpoints_rejected():
    """Unauthenticated calls to voice endpoints must return HTTP 401."""
    fake_audio = io.BytesIO(b"RIFFdummywavdata")
    res1 = client.post(
        "/api/v1/reports/transcribe-audio",
        files={"file": ("test.wav", fake_audio, "audio/wav")},
    )
    assert res1.status_code == 401

    fake_audio.seek(0)
    res2 = client.post(
        "/api/v1/reports/analyze-audio",
        files={"file": ("test.wav", fake_audio, "audio/wav")},
    )
    assert res2.status_code == 401


def test_unauthenticated_image_endpoints_rejected():
    """Unauthenticated calls to image endpoints must return HTTP 401."""
    fake_img = io.BytesIO(b"\xff\xd8\xff\xe0dummyjpeg")
    res = client.post(
        "/api/v1/reports/analyze-image",
        files={"file": ("test.jpg", fake_img, "image/jpeg")},
    )
    assert res.status_code == 401


# ==============================================================================
# 2. AUDIO VALIDATION TESTS
# ==============================================================================

def test_empty_audio_rejected():
    """Empty audio file submission must return HTTP 400."""
    empty_file = io.BytesIO(b"")
    res = client.post(
        "/api/v1/reports/analyze-audio",
        files={"file": ("empty.wav", empty_file, "audio/wav")},
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 400
    assert "Empty audio" in res.json().get("detail", "")


def test_unsupported_audio_mime_rejected():
    """Unsupported audio MIME formats (e.g. text/plain, video/avi) must return HTTP 400."""
    bad_file = io.BytesIO(b"hello world text data")
    res = client.post(
        "/api/v1/reports/analyze-audio",
        files={"file": ("bad.txt", bad_file, "text/plain")},
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 400
    assert "Unsupported audio type" in res.json().get("detail", "")


def test_oversized_audio_rejected():
    """Audio files exceeding 10 MB must return HTTP 413 Entity Too Large."""
    oversized_bytes = b"0" * (10 * 1024 * 1024 + 1024)
    res = client.post(
        "/api/v1/reports/analyze-audio",
        files={"file": ("large.webm", io.BytesIO(oversized_bytes), "audio/webm")},
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 413


# ==============================================================================
# 3. AUDIO TRANSCRIPTION & VOICE ANALYSIS TESTS
# ==============================================================================

def test_transcribe_audio_success():
    """Tests speech-to-text transcription returns verbatim transcript."""
    fake_audio = io.BytesIO(b"dummywebmaudiodata12345")

    with patch("app.services.gemini_service.gemini_service.transcribe_audio", new_callable=AsyncMock) as mock_transcribe:
        mock_transcribe.return_value = {
            "success": True,
            "transcript": "The streetlight near the bus stop has not worked for two days.",
        }

        res = client.post(
            "/api/v1/reports/transcribe-audio",
            files={"file": ("voice.webm", fake_audio, "audio/webm")},
            headers=AUTH_HEADERS,
        )

        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["transcript"] == "The streetlight near the bus stop has not worked for two days."


def test_unclear_speech_handling():
    """When audio speech is unintelligible or empty, returns polite guidance."""
    fake_audio = io.BytesIO(b"silenceoraudionoise1234")

    with patch("app.services.gemini_service.gemini_service.transcribe_audio", new_callable=AsyncMock) as mock_transcribe:
        mock_transcribe.return_value = {
            "success": False,
            "code": "UNCLEAR_SPEECH",
            "message": "SafeSphere could not confidently understand the recording.",
        }

        res = client.post(
            "/api/v1/reports/transcribe-audio",
            files={"file": ("silent.webm", fake_audio, "audio/webm")},
            headers=AUTH_HEADERS,
        )

        assert res.status_code == 200
        data = res.json()
        assert data["success"] is False
        assert data["code"] == "UNCLEAR_SPEECH"
        assert "could not confidently understand" in data["message"]


def test_analyze_audio_workflow_and_temp_cleanup():
    """
    Tests end-to-end voice analysis:
    - Audio transcribed
    - Output normalized to SafetyReportAIAnalysisResult schema
    - Temporary file is strictly deleted
    """

    fake_audio = io.BytesIO(b"dummyrecordingbytes4567")

    mock_analysis = SafetyReportAIAnalysisResult(
        category="poor_lighting",
        severity="medium",
        summary="Streetlight near the bus stop appears to be non-functional.",
        safety_signal="poor_lighting",
        confidence=0.91,
        suggested_action="Review and report the lighting condition.",
    )

    with patch("app.services.gemini_service.gemini_service.analyze_safety_audio", new_callable=AsyncMock) as mock_analyze:
        mock_analyze.return_value = {
            "success": True,
            "transcript": "The streetlight near the bus stop has not worked for two days.",
            "input_type": "voice",
            "analysis": mock_analysis.model_dump(),
        }

        res = client.post(
            "/api/v1/reports/analyze-audio",
            files={"file": ("report_voice.webm", fake_audio, "audio/webm")},
            headers=AUTH_HEADERS,
        )

        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["input_type"] == "voice"
        assert data["transcript"] == "The streetlight near the bus stop has not worked for two days."
        assert data["analysis"]["category"] == "poor_lighting"
        assert data["analysis"]["severity"] == "medium"
        assert data["analysis"]["confidence"] == 0.91

    # Verify temp audio files directory is clean of any lingering test files
    temp_files = list(TEMP_AUDIO_DIR.glob("*.webm"))
    assert len(temp_files) == 0


# ==============================================================================
# 4. IMAGE VALIDATION & VISUAL ANALYSIS TESTS
# ==============================================================================

def test_empty_image_rejected():
    """Empty image upload must return HTTP 400."""
    empty_file = io.BytesIO(b"")
    res = client.post(
        "/api/v1/reports/analyze-image",
        files={"file": ("empty.jpg", empty_file, "image/jpeg")},
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 400
    assert "Empty image" in res.json().get("detail", "")


def test_unsupported_image_mime_rejected():
    """Unsupported image format (e.g. image/gif, application/pdf) must return HTTP 400."""
    bad_img = io.BytesIO(b"GIF89a fake gif data")
    res = client.post(
        "/api/v1/reports/analyze-image",
        files={"file": ("sample.gif", bad_img, "image/gif")},
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 400
    assert "Unsupported image type" in res.json().get("detail", "")


def test_oversized_image_rejected():
    """Image files exceeding 10 MB must return HTTP 413 Entity Too Large."""
    oversized_bytes = b"0" * (10 * 1024 * 1024 + 1024)
    res = client.post(
        "/api/v1/reports/analyze-image",
        files={"file": ("large.png", io.BytesIO(oversized_bytes), "image/png")},
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 413


def test_analyze_image_success():
    """
    Tests visual safety analysis with mock Gemini response:
    - Stores image securely
    - Returns normalized SafetyReportAIAnalysisResult
    - Returns private media_url
    """
    fake_img = io.BytesIO(b"\x89PNG\r\n\x1a\nfakeimagebytes1234")

    mock_analysis = SafetyReportAIAnalysisResult(
        category="road_damage",
        severity="medium",
        summary="The image appears to show a damaged section of road.",
        safety_signal="road_damage",
        confidence=0.88,
        suggested_action="Review and report the road condition.",
    )

    with patch("app.services.gemini_service.gemini_service.analyze_safety_image", new_callable=AsyncMock) as mock_analyze:
        mock_analyze.return_value = {
            "success": True,
            "analysis": mock_analysis.model_dump(),
            "input_type": "image",
        }

        res = client.post(
            "/api/v1/reports/analyze-image",
            files={"file": ("pothole.png", fake_img, "image/png")},
            headers=AUTH_HEADERS,
        )

        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["input_type"] == "image"
        assert data["media_url"].startswith("/api/v1/reports/media/images/")
        assert data["analysis"]["category"] == "road_damage"
        assert data["analysis"]["severity"] == "medium"
        assert data["analysis"]["confidence"] == 0.88


def test_analyze_image_with_user_description():
    """
    Tests Image + Text combination:
    Both photo and text description are passed to Gemini for unified classification.
    """
    fake_img = io.BytesIO(b"\x89PNG\r\n\x1a\nblockedpathbytes")

    mock_analysis = SafetyReportAIAnalysisResult(
        category="road_obstruction",
        severity="medium",
        summary="Pedestrian path is obstructed by construction materials.",
        safety_signal="road_obstruction",
        confidence=0.92,
        suggested_action="Report obstruction to municipal authorities.",
    )

    with patch("app.services.gemini_service.gemini_service.analyze_safety_image", new_callable=AsyncMock) as mock_analyze:
        mock_analyze.return_value = {
            "success": True,
            "analysis": mock_analysis.model_dump(),
            "input_type": "image_text",
        }

        res = client.post(
            "/api/v1/reports/analyze-image",
            files={"file": ("obstruction.png", fake_img, "image/png")},
            data={"description": "The pedestrian path is blocked by construction material."},
            headers=AUTH_HEADERS,
        )

        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["analysis"]["category"] == "road_obstruction"
        assert data["analysis"]["safety_signal"] == "road_obstruction"


def test_image_uncertainty_handling():
    """
    When an image does not clearly depict a safety hazard:
    Returns category 'other' with explanatory summary.
    """
    fake_img = io.BytesIO(b"\xff\xd8\xff\xe0blurryphoto")

    mock_analysis = SafetyReportAIAnalysisResult(
        category="other",
        severity="low",
        summary="The image does not provide enough evidence to classify a specific safety issue.",
        safety_signal="other",
        confidence=0.45,
        suggested_action="Review and report the condition manually if a hazard exists.",
    )


    with patch("app.services.gemini_service.gemini_service.analyze_safety_image", new_callable=AsyncMock) as mock_analyze:
        mock_analyze.return_value = {
            "success": True,
            "analysis": mock_analysis.model_dump(),
            "input_type": "image",
        }

        res = client.post(
            "/api/v1/reports/analyze-image",
            files={"file": ("blurry.jpg", fake_img, "image/jpeg")},
            headers=AUTH_HEADERS,
        )

        assert res.status_code == 200
        data = res.json()
        assert data["analysis"]["category"] == "other"
        assert "not provide enough evidence" in data["analysis"]["summary"]


# ==============================================================================
# 5. PRIVATE EVIDENCE MEDIA ACCESS & SECURITY
# ==============================================================================

def test_private_media_serving_and_traversal_protection():
    """
    Tests private image access:
    - Path traversal attempts return HTTP 400
    - Non-existent files return HTTP 404
    - Valid files are served with FileResponse
    """
    # 1. Traversal attempt
    res_trav = client.get(
        "/api/v1/reports/media/images/../../etc/passwd",
        headers=AUTH_HEADERS,
    )
    assert res_trav.status_code in [400, 404]

    # 2. Non-existent file
    res_404 = client.get(
        "/api/v1/reports/media/images/00000000000000000000000000000000.jpg",
        headers=AUTH_HEADERS,
    )
    assert res_404.status_code == 404

    # 3. Create test file and fetch
    test_filename = "1234567890abcdef1234567890abcdef.jpg"
    test_path = IMAGES_DIR / test_filename
    with open(test_path, "wb") as f:
        f.write(b"\xff\xd8\xff\xe0testjpegcontent")

    try:
        res_fetch = client.get(
            f"/api/v1/reports/media/images/{test_filename}",
            headers=AUTH_HEADERS,
        )
        assert res_fetch.status_code == 200
        assert res_fetch.content == b"\xff\xd8\xff\xe0testjpegcontent"
    finally:
        if test_path.exists():
            test_path.unlink()


# ==============================================================================
# 6. FINAL REPORT CREATION & MAP INTEGRATION WITH MULTI-MODAL DATA
# ==============================================================================

def test_voice_report_final_submission_and_persistence():
    """
    Submitting a final voice report preserves:
    - transcript
    - report_type = voice
    - user choice over AI suggestion
    - status = OPEN, verification_status = PENDING
    """
    payload = {
        "category": "poor_lighting",
        "severity": "HIGH",  # User explicitly elevated severity from Medium to High
        "title": "Dark Stretch near Main Bus Terminal",
        "description": "Streetlight near the bus stop has not worked for two days.",
        "latitude": 12.8116,
        "longitude": 77.5146,
        "location_label": "Bus Stop, Sector 8",
        "report_type": "voice",
        "transcript": "The streetlight near the bus stop has not worked for two days.",
    }

    res = client.post("/api/v1/reports", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 201
    data = res.json()

    assert data["report_type"] == "voice"
    assert data["severity"] == "HIGH"  # User choice preserved
    assert data["transcript"] == payload["transcript"]
    assert data["status"] == "OPEN"
    assert data["verification_status"] == "PENDING"
    assert data["verification_count"] == 0

    report_id = data["id"]

    # Verify map endpoint includes the report marker
    map_res = client.get(
        "/api/v1/reports/nearby",
        params={"latitude": 12.8116, "longitude": 77.5146, "radius_meters": 500},
    )
    assert map_res.status_code == 200
    reports = map_res.json()
    matched = [r for r in reports if str(r["id"]) == report_id]
    assert len(matched) == 1

    # Map public endpoint MUST NOT leak transcript or media_url for privacy
    pub_item = matched[0]
    assert "transcript" not in pub_item
    assert "media_url" not in pub_item


def test_image_report_final_submission_and_persistence():
    """
    Submitting a final photo report preserves:
    - media_url
    - media_type
    - report_type = image
    - status = OPEN, verification_status = PENDING
    """
    payload = {
        "category": "road_damage",
        "severity": "MEDIUM",
        "title": "Large Pothole on 2nd Cross Road",
        "description": "Deep asphalt crater creating vehicular hazard.",
        "latitude": 12.8220,
        "longitude": 77.5250,
        "location_label": "2nd Cross Rd, Sector 9",
        "report_type": "image",
        "media_url": "/api/v1/reports/media/images/abcdef1234567890abcdef1234567890.jpg",
        "media_type": "image/jpeg",
    }

    res = client.post("/api/v1/reports", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 201
    data = res.json()

    assert data["report_type"] == "image"
    assert data["media_url"] == payload["media_url"]
    assert data["media_type"] == "image/jpeg"

    assert data["status"] == "OPEN"
    assert data["verification_status"] == "PENDING"
