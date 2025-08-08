from fastapi import Request
from fastapi.responses import JSONResponse
from app.application.exceptions import UseCaseException, PatternNotFoundException

def register_exception_handlers(app):
    @app.exception_handler(UseCaseException)
    async def use_case_exception_handler(request: Request, exc: UseCaseException):
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    @app.exception_handler(PatternNotFoundException)
    async def pattern_not_found_exception_handler(request: Request, exc: PatternNotFoundException):
        return JSONResponse(status_code=404, content={"detail": str(exc)})
