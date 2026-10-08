import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("safesphere.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Structured HTTP request/response logging middleware for auditability and observability.
    """

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000

        # Don't clutter logs with repeated health polls in debug mode
        if not request.url.path.endswith("/health"):
            logger.info(
                f"{request.method} {request.url.path} -> status={response.status_code} in {process_time:.2f}ms"
            )

        response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
        return response
