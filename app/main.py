from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine, ensure_runtime_schema
from app.routers import advice, chat, llm, predict, usage, users
from app.routers.national import router as national_router
from app.services.national import NationalServiceError
from app.state import app_state
from src.data_loader import DataValidationError
from src.forecast.sarima_model import ForecastingError
from src.preprocess import DataProcessingError


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
FRONTEND_DIST_DIR = FRONTEND_DIR / "dist"
FRONTEND_ASSETS_DIR = FRONTEND_DIST_DIR / "assets"


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_runtime_schema()
    yield


app = FastAPI(
    title="Household Power Assistant API",
    description="家庭用电预测与节能建议 MVP 后端骨架",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(usage.router)
app.include_router(predict.router)
app.include_router(advice.router)
app.include_router(chat.router)
app.include_router(llm.router)
app.include_router(national_router)

if FRONTEND_ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS_DIR), name="assets")


@app.get("/", response_class=HTMLResponse)
def root():
    index_file = FRONTEND_DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)

    return HTMLResponse(
        content=(
            "<h1>Frontend build not found</h1>"
            "<p>Run <code>npm.cmd install</code> and <code>npm.cmd run build</code> in the "
            "<code>frontend</code> directory.</p>"
        ),
        status_code=503,
    )


@app.get("/health")
def health() -> JSONResponse:
    return JSONResponse(
        {
            "message": "Household Power Assistant API is running",
            "database_backend": engine.url.get_backend_name(),
        }
    )


@app.exception_handler(NationalServiceError)
@app.exception_handler(DataValidationError)
@app.exception_handler(DataProcessingError)
@app.exception_handler(ForecastingError)
def handle_known_errors(_: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=400, content={"code": 1, "message": str(exc), "detail": str(exc), "data": {}})


@app.exception_handler(RequestValidationError)
def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"code": 1, "message": "request validation failed", "detail": exc.errors(), "data": {}})


app.state.runtime = app_state
