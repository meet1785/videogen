"""Rate limiting middleware using a sliding-window in-memory store."""
import time
import logging
import threading
from collections import defaultdict, deque

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.config import settings

logger = logging.getLogger(__name__)


class RateLimiter:
    """Thread-safe sliding-window rate limiter."""

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # Maps client IP -> deque of request timestamps
        self._requests: dict = defaultdict(deque)
        self._lock = threading.Lock()

    def is_allowed(self, client_ip: str) -> tuple[bool, int]:
        """
        Check whether a request from *client_ip* is within the rate limit.

        Returns (allowed, retry_after_seconds).
        """
        now = time.monotonic()
        cutoff = now - self.window_seconds

        with self._lock:
            timestamps = self._requests[client_ip]

            # Remove timestamps outside the current window
            while timestamps and timestamps[0] < cutoff:
                timestamps.popleft()

            if len(timestamps) < self.max_requests:
                timestamps.append(now)
                return True, 0

            # Oldest request still inside the window
            oldest = timestamps[0]
            retry_after = int(oldest - cutoff) + 1
            return False, retry_after


_limiter: RateLimiter | None = None
_limiter_lock = threading.Lock()


def get_limiter() -> RateLimiter:
    """Return (or lazily create) the module-level RateLimiter singleton.

    Thread-safe: a double-checked lock ensures only one instance is ever
    created even when multiple threads call this simultaneously.
    """
    global _limiter
    if _limiter is None:
        with _limiter_lock:
            if _limiter is None:
                _limiter = RateLimiter(
                    max_requests=settings.rate_limit_requests,
                    window_seconds=settings.rate_limit_window,
                )
    return _limiter


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware that enforces per-IP rate limits on all API routes."""

    # Paths that are never rate-limited
    EXEMPT_PATHS = {"/", "/ping", "/docs", "/redoc", "/openapi.json"}

    async def dispatch(self, request: Request, call_next) -> Response:
        if not settings.rate_limit_enabled:
            return await call_next(request)

        # Only rate-limit paths that start with /api/ and are not explicitly exempt
        if not request.url.path.startswith("/api/") or request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        limiter = get_limiter()
        allowed, retry_after = limiter.is_allowed(client_ip)

        if not allowed:
            logger.warning(f"Rate limit exceeded for IP {client_ip}")
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please slow down.",
                    "retry_after": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        response = await call_next(request)
        return response
