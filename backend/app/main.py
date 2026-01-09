"""
Xeeno Map - National Digital Postal Code and Address System for Sierra Leone

Main FastAPI application entry point.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.api.v1 import router as api_v1_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    # Startup
    print(f"Starting {settings.app_name} v{settings.app_version}")
    await init_db()
    yield
    # Shutdown
    print("Shutting down...")


app = FastAPI(
    title=settings.app_name,
    description="""
    National Digital Postal Code and Address System for Sierra Leone.

    ## Features

    - **Address Search**: Find addresses by text, postal code, or PDA-ID
    - **Address Registration**: Register new addresses with GPS coordinates
    - **Address Verification**: Verify addresses for payments and deliveries
    - **Reverse Geocoding**: Find addresses near GPS coordinates
    - **Postal Zones**: Browse and query postal zone boundaries

    ## Postal Code Format

    `XXXX-YYY` where:
    - XXXX = Primary zone code (region + district + zone)
    - YYY = Delivery segment

    ## PDA-ID Format

    `SL-XXXX-YYY-NNNNNN-C` where:
    - SL = Country prefix (Sierra Leone)
    - XXXX-YYY = Postal zone code
    - NNNNNN = Sequential number
    - C = Check digit (Luhn algorithm)
    """,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_v1_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "description": "National Digital Postal Code and Address System for Sierra Leone",
        "documentation": "/docs",
        "api_base": "/api/v1",
        "endpoints": {
            "search": "/api/v1/address/search",
            "autocomplete": "/api/v1/address/autocomplete",
            "register": "/api/v1/address/register",
            "verify": "/api/v1/address/verify",
            "resolve": "/api/v1/address/location/resolve",
            "zones": "/api/v1/zones"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version
    }


@app.get("/api")
async def api_info():
    """API version information."""
    return {
        "versions": {
            "v1": {
                "status": "current",
                "base_url": "/api/v1"
            }
        },
        "documentation": "/docs"
    }
