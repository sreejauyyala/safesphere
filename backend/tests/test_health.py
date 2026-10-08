from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check_endpoint():
    """
    Verifies that GET /api/v1/health conforms to the SafeSphere specification:
    Response:
    {
      "status": "ok",
      "service": "SafeSphere API"
    }
    """
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "SafeSphere API"


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert "version" in response.json()


def test_detailed_health_check_endpoint():
    response = client.get("/api/v1/health/details")
    assert response.status_code == 200
    data = response.json()
    assert "database" in data
    assert "gemini_ai_configured" in data
