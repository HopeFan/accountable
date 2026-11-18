"""FastAPI app: the JSON API under /api, and the built frontend when it exists."""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import clock, db, seed
from .routes import activities, contacts, dashboard, deals, follow_ups, organizations

DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    seed.ensure_seeded()
    yield


app = FastAPI(title="Accountable", lifespan=lifespan)

api = APIRouter(prefix="/api")


@api.get("/health")
def health():
    return {"status": "ok", "today": clock.today().isoformat(), "now": clock.now().isoformat()}


for module in (organizations, contacts, deals, activities, follow_ups, dashboard):
    api.include_router(module.router)
app.include_router(api)


@app.exception_handler(RequestValidationError)
async def validation_error(_request: Request, exc: RequestValidationError):
    detail = []
    for err in exc.errors():
        loc = [str(p) for p in err["loc"] if p not in ("body", "query", "path")]
        msg = err["msg"].removeprefix("Value error, ")
        if err["type"] == "string_too_short":
            msg = "This field is required"
        elif err["type"] == "missing":
            msg = "This field is required"
        elif err["type"] in ("greater_than_equal", "less_than_equal"):
            msg = "Enter a number in the allowed range"
        elif err["type"] in ("int_parsing", "int_type"):
            msg = "Enter a whole number"
        elif err["type"] in ("date_parsing", "date_from_datetime_parsing", "datetime_parsing"):
            msg = "Enter a valid date"
        detail.append({"field": ".".join(loc) or "body", "message": msg})
    return JSONResponse(status_code=422, content={"detail": detail})


if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        candidate = (DIST / path).resolve()
        if path and candidate.is_file() and DIST in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(DIST / "index.html")
