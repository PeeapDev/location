"""API v1 routes."""

from fastapi import APIRouter

from app.api.v1 import address, zones, auth, users, geography, analytics, api_keys, audit, settings, poi, search, spatial

router = APIRouter(prefix="/v1")

# Public routes
router.include_router(address.router, prefix="/address", tags=["Address"])
router.include_router(zones.router, prefix="/zones", tags=["Zones"])
router.include_router(poi.router, prefix="/pois", tags=["POI"])
router.include_router(search.router, prefix="/search", tags=["Search"])
router.include_router(spatial.router, prefix="/spatial", tags=["Spatial"])

# Authentication routes
router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Admin routes
router.include_router(users.router, prefix="/users", tags=["User Management"])
router.include_router(geography.router, prefix="/geography", tags=["Geography"])
router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
router.include_router(api_keys.router, prefix="/api-keys", tags=["API Keys"])
router.include_router(audit.router, prefix="/audit", tags=["Audit"])
router.include_router(settings.router, prefix="/settings", tags=["Settings"])
