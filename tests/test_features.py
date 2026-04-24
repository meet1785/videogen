"""Unit tests for the three new features:
1. Task List Endpoint (GET /api/v1/tasks)
2. Rate Limiting Middleware
3. Webhook Notification on task completion
"""
import asyncio
import json
import time
from collections import deque
from datetime import datetime, timezone
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def test_client():
    """Return a synchronous TestClient bound to the FastAPI app.

    We use an in-memory SQLite database so no files are created on disk.
    """
    import os

    os.environ.setdefault("OUTPUT_DIR", "/tmp/videogen_test_outputs")
    os.makedirs("/tmp/videogen_test_outputs", exist_ok=True)

    # Override DB URL to use in-memory SQLite before importing the app
    from app.services import database as db_module

    db_module.db_service = db_module.DatabaseService(
        database_url="sqlite+aiosqlite:///:memory:"
    )

    from app.services import video_generator as vg_module

    vg_module.video_service.db = db_module.db_service
    vg_module.video_service.output_dir = "/tmp/videogen_test_outputs"

    from app.main import app

    with TestClient(app) as client:
        yield client


# ---------------------------------------------------------------------------
# Feature 1: Task List Endpoint
# ---------------------------------------------------------------------------


class TestTaskListEndpoint:
    """Tests for GET /api/v1/tasks."""

    def test_list_tasks_returns_200(self, test_client):
        response = test_client.get("/api/v1/tasks")
        assert response.status_code == 200

    def test_list_tasks_response_shape(self, test_client):
        response = test_client.get("/api/v1/tasks")
        data = response.json()
        assert "tasks" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data
        assert isinstance(data["tasks"], list)

    def test_list_tasks_default_pagination(self, test_client):
        response = test_client.get("/api/v1/tasks")
        data = response.json()
        assert data["limit"] == 50
        assert data["offset"] == 0

    def test_list_tasks_custom_pagination(self, test_client):
        response = test_client.get("/api/v1/tasks?limit=10&offset=5")
        data = response.json()
        assert data["limit"] == 10
        assert data["offset"] == 5

    def test_list_tasks_invalid_limit_too_large(self, test_client):
        response = test_client.get("/api/v1/tasks?limit=200")
        assert response.status_code == 422

    def test_list_tasks_invalid_limit_zero(self, test_client):
        response = test_client.get("/api/v1/tasks?limit=0")
        assert response.status_code == 422

    def test_list_tasks_negative_offset(self, test_client):
        response = test_client.get("/api/v1/tasks?offset=-1")
        assert response.status_code == 422

    def test_list_tasks_invalid_status(self, test_client):
        response = test_client.get("/api/v1/tasks?status=unknown_status")
        assert response.status_code == 422

    def test_list_tasks_valid_status_filter(self, test_client):
        for status in ("pending", "processing", "completed", "failed"):
            response = test_client.get(f"/api/v1/tasks?status={status}")
            assert response.status_code == 200

    def test_list_tasks_task_appears_after_creation(self, test_client):
        """Create a task and verify it shows up in the list."""
        gen_resp = test_client.post(
            "/api/v1/generate",
            json={
                "prompt": "Test list endpoint",
                "platform": "default",
                "duration": 1,
                "width": 64,
                "height": 64,
            },
        )
        assert gen_resp.status_code == 200
        task_id = gen_resp.json()["task_id"]

        list_resp = test_client.get("/api/v1/tasks")
        assert list_resp.status_code == 200
        task_ids = [t["task_id"] for t in list_resp.json()["tasks"]]
        assert task_id in task_ids

    def test_list_tasks_total_increments(self, test_client):
        before = test_client.get("/api/v1/tasks").json()["total"]
        test_client.post(
            "/api/v1/generate",
            json={
                "prompt": "Increment total test",
                "platform": "default",
                "duration": 1,
                "width": 64,
                "height": 64,
            },
        )
        after = test_client.get("/api/v1/tasks").json()["total"]
        assert after == before + 1


# ---------------------------------------------------------------------------
# Feature 2: Rate Limiting Middleware
# ---------------------------------------------------------------------------


class TestRateLimiter:
    """Unit tests for the RateLimiter class (no HTTP overhead)."""

    def _make_limiter(self, max_requests: int = 5, window_seconds: int = 10):
        from app.utils.rate_limiter import RateLimiter

        return RateLimiter(max_requests=max_requests, window_seconds=window_seconds)

    def test_allows_requests_within_limit(self):
        limiter = self._make_limiter(max_requests=5)
        for _ in range(5):
            allowed, _ = limiter.is_allowed("1.2.3.4")
            assert allowed

    def test_blocks_request_over_limit(self):
        limiter = self._make_limiter(max_requests=3)
        for _ in range(3):
            limiter.is_allowed("1.2.3.4")
        allowed, retry_after = limiter.is_allowed("1.2.3.4")
        assert not allowed
        assert retry_after > 0

    def test_different_ips_independent(self):
        limiter = self._make_limiter(max_requests=2)
        limiter.is_allowed("10.0.0.1")
        limiter.is_allowed("10.0.0.1")
        # Third request from 10.0.0.1 should be blocked
        allowed_1, _ = limiter.is_allowed("10.0.0.1")
        # But first request from different IP should be fine
        allowed_2, _ = limiter.is_allowed("10.0.0.2")
        assert not allowed_1
        assert allowed_2

    def test_window_expiry_resets_counter(self):
        """Requests outside the window should be forgotten."""
        limiter = self._make_limiter(max_requests=2, window_seconds=1)
        limiter.is_allowed("9.9.9.9")
        limiter.is_allowed("9.9.9.9")

        # Wait for window to expire
        time.sleep(1.1)

        allowed, _ = limiter.is_allowed("9.9.9.9")
        assert allowed


class TestRateLimitMiddlewareHTTP:
    """Integration tests for the HTTP-level rate-limit middleware."""

    def test_health_endpoint_not_rate_limited(self, test_client):
        """The /ping path is exempt from rate limiting."""
        # Patch the limiter to always deny to prove /ping bypasses it
        with patch(
            "app.utils.rate_limiter.RateLimiter.is_allowed", return_value=(False, 1)
        ):
            response = test_client.get("/ping")
        assert response.status_code == 200

    def test_api_endpoint_rate_limited(self, test_client):
        """When the limiter denies, the API returns 429."""
        with patch(
            "app.utils.rate_limiter.get_limiter"
        ) as mock_get_limiter:
            mock_limiter = MagicMock()
            mock_limiter.is_allowed.return_value = (False, 5)
            mock_get_limiter.return_value = mock_limiter

            response = test_client.get("/api/v1/health")
        assert response.status_code == 429
        assert "retry_after" in response.json()
        assert response.headers.get("retry-after") == "5"

    def test_rate_limit_disabled_bypasses_block(self, test_client):
        """When rate_limit_enabled=False the middleware never blocks."""
        from app.config import settings

        original = settings.rate_limit_enabled
        try:
            settings.rate_limit_enabled = False
            with patch(
                "app.utils.rate_limiter.get_limiter"
            ) as mock_get_limiter:
                mock_limiter = MagicMock()
                mock_limiter.is_allowed.return_value = (False, 10)
                mock_get_limiter.return_value = mock_limiter

                response = test_client.get("/api/v1/health")
            assert response.status_code == 200
        finally:
            settings.rate_limit_enabled = original


# ---------------------------------------------------------------------------
# Feature 3: Webhook Notification
# ---------------------------------------------------------------------------


class TestWebhookNotification:
    """Tests for the per-task webhook notification on completion."""

    def test_generate_accepts_webhook_url(self, test_client):
        resp = test_client.post(
            "/api/v1/generate",
            json={
                "prompt": "Webhook test video",
                "platform": "default",
                "duration": 1,
                "width": 64,
                "height": 64,
                "webhook_url": "https://example.com/webhook",
            },
        )
        assert resp.status_code == 200
        assert "task_id" in resp.json()

    def test_webhook_url_stored_on_task(self, test_client):
        """Ensure webhook_url field is persisted with the task."""
        webhook_url = "https://hooks.example.com/notify"
        gen_resp = test_client.post(
            "/api/v1/generate",
            json={
                "prompt": "Webhook storage test",
                "platform": "default",
                "duration": 1,
                "width": 64,
                "height": 64,
                "webhook_url": webhook_url,
            },
        )
        assert gen_resp.status_code == 200
        task_id = gen_resp.json()["task_id"]

        # Retrieve task from DB
        from app.services.database import db_service

        async def _check():
            task = await db_service.get_task(task_id)
            return task

        task = asyncio.run(_check())
        assert task is not None
        assert task.webhook_url == webhook_url

    @pytest.mark.asyncio
    async def test_notify_webhook_posts_payload(self):
        """_notify_webhook should POST the correct payload."""
        from app.services.video_generator import VideoGenerationService

        svc = VideoGenerationService.__new__(VideoGenerationService)

        posted_payloads = []

        mock_response = MagicMock()
        mock_response.status_code = 200

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)

        with patch("app.services.video_generator.httpx.AsyncClient", return_value=mock_client):
            await svc._notify_webhook(
                "https://example.com/hook",
                task_id="abc-123",
                status="completed",
                video_url="/api/v1/download/abc-123.mp4",
            )

        mock_client.post.assert_called_once()
        call_kwargs = mock_client.post.call_args
        assert call_kwargs[0][0] == "https://example.com/hook"
        payload = call_kwargs[1]["json"]
        assert payload["task_id"] == "abc-123"
        assert payload["status"] == "completed"
        assert payload["video_url"] == "/api/v1/download/abc-123.mp4"

    @pytest.mark.asyncio
    async def test_notify_webhook_skips_when_no_url(self):
        """_notify_webhook should be a no-op when webhook_url is None."""
        from app.services.video_generator import VideoGenerationService

        svc = VideoGenerationService.__new__(VideoGenerationService)

        with patch("app.services.video_generator.httpx.AsyncClient") as mock_cls:
            await svc._notify_webhook(None, "task-id", "completed")
            mock_cls.assert_not_called()

    @pytest.mark.asyncio
    async def test_notify_webhook_handles_connection_error(self):
        """A failing webhook should be logged but not raise."""
        from app.services.video_generator import VideoGenerationService

        svc = VideoGenerationService.__new__(VideoGenerationService)

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(side_effect=Exception("Connection refused"))

        with patch("app.services.video_generator.httpx.AsyncClient", return_value=mock_client):
            # Should NOT raise
            await svc._notify_webhook(
                "https://unreachable.example.com/hook",
                "task-id",
                "failed",
                error="Something went wrong",
            )
