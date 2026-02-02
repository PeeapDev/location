# Xeeno Map - Sierra Leone National Postal Address System

## Project Overview

Xeeno Map is a National Digital Postal Code and Address System for Sierra Leone. The system provides:
- Unique postal codes for all regions, districts, and zones
- Physical Digital Address (PDA-ID) generation for every location
- Geographic zone management
- Address registration and lookup services

## Technology Stack

### Frontend (Next.js)
- **Location**: `frontend/`
- **Framework**: Next.js 14.1.0 with App Router
- **State Management**: Zustand 4.5.0, React Query 5.17.19
- **Styling**: Tailwind CSS 3.4.1
- **Maps**: MapLibre GL 4.0.0

### Backend (FastAPI)
- **Location**: `backend/`
- **Framework**: FastAPI 0.109.0
- **Database**: PostgreSQL with SQLAlchemy 2.0.25, asyncpg, GeoAlchemy2
- **Authentication**: JWT (python-jose), bcrypt
- **GIS**: Shapely 2.0.2, GeoJSON

## Postal Code Format (XYZZ)

Sierra Leone uses a 4-digit postal code system:
- **X** = Region (1-5)
- **Y** = District within region (0-9)
- **ZZ** = Zone within district (00-99)

### Region Codes
| Code | Region |
|------|--------|
| 1 | Western Area (10xx-11xx) |
| 2 | Northern Province (21xx-25xx) |
| 3 | North West Province (31xx-32xx) |
| 4 | Southern Province (41xx-44xx) |
| 5 | Eastern Province (51xx-53xx) |

### Zone Codes
Each postal code can have multiple zones: `{postal_code}-{sequence}` (e.g., 1100-001, 1100-002)

## PDA-ID Format

Physical Digital Address ID: `SL-XYZZ-NNN-NNNNNN-C`

- **SL** = Country code (Sierra Leone)
- **XYZZ** = Postal code
- **NNN** = Segment number
- **NNNNNN** = Address sequence
- **C** = Check digit (Luhn algorithm)

Example: `SL-1100-001-000001-2`

## Project Structure

```
location/
├── frontend/                    # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/          # Admin dashboard routes (protected)
│   │   │   │   ├── directory/  # Admin directory page
│   │   │   │   ├── addresses/  # Address management
│   │   │   │   ├── api-keys/   # API key management
│   │   │   │   ├── geography/  # Region/zone management
│   │   │   │   ├── system/     # System settings
│   │   │   │   └── users/      # User management
│   │   │   ├── directory/      # Public directory page
│   │   │   ├── search/         # Public search
│   │   │   ├── register/       # Address registration
│   │   │   └── login/          # Authentication
│   │   ├── components/
│   │   │   ├── admin/          # Admin-specific components
│   │   │   │   └── Sidebar.tsx # Admin navigation sidebar
│   │   │   └── LayoutWrapper.tsx # Conditional layout (nav/footer)
│   │   └── store/              # Zustand stores
│   └── public/
│
├── backend/                     # FastAPI backend
│   ├── app/
│   │   ├── api/v1/             # API endpoints
│   │   │   ├── address.py
│   │   │   ├── geography.py
│   │   │   ├── zones.py
│   │   │   ├── auth.py
│   │   │   └── users.py
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic
│   │   └── data/               # Geography seed data
│   └── requirements.txt
│
└── data/                        # Geographic data scripts
    └── shapefiles/
```

## Key Components

### Admin Layout
- Admin routes (`/admin/*`) do NOT show the public navbar and footer
- Uses `LayoutWrapper.tsx` to conditionally render based on route
- Sidebar navigation in `components/admin/Sidebar.tsx`

### Directory Page (Admin)
- **Location**: `src/app/admin/directory/page.tsx`
- Three-level hierarchical navigation:
  1. **Level 1**: Grid of unique postal codes (click to drill down)
  2. **Level 2**: Zones within selected postal code (click to see details)
  3. **Level 3**: Zone detail view with addresses
- Tabs: Postal Zones, Addresses, Zone Lookup (by coordinates)
- Shows coordinates (lat/lng) for each zone
- Fallback data if API unavailable

### Public Directory
- **Location**: `src/app/directory/page.tsx`
- Similar to admin but accessible without authentication
- Shows nav and footer via LayoutWrapper

### API Endpoints
- `GET /api/v1/geography/zones` - List all postal zones
- `GET /api/v1/geography/zones/lookup?lat=X&lng=Y` - Find zone by coordinates
- `GET /api/v1/addresses/` - List addresses
- `POST /api/v1/addresses/` - Register new address

## Development

### Frontend
```bash
cd frontend
npm install
npm run dev       # Development (port 3000)
npm run build     # Production build
npm run lint      # Run linter
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload  # Development (port 8000)
```

## Important Notes

1. **Country**: This system is for **Sierra Leone**, NOT New Zealand
2. **Coordinates**: Sierra Leone bounds are approximately:
   - Latitude: 6 to 10
   - Longitude: -14 to -10
3. **Admin Routes**: All `/admin/*` routes are protected and use the admin layout
4. **TypeScript**: Use `Array.from(new Set(...))` instead of `[...new Set(...)]` for Set spreading (tsconfig compatibility)

## Test Locations (Sierra Leone)

| Location | Latitude | Longitude |
|----------|----------|-----------|
| Central Freetown | 8.479 | -13.230 |
| Cline Town | 8.478 | -13.198 |
| Lumley Beach | 8.428 | -13.292 |
| Waterloo | 8.332 | -13.062 |
| Makeni | 8.890 | -12.050 |
| Bo City | 7.965 | -11.740 |
| Kenema | 7.878 | -11.192 |
| Koidu | 8.645 | -10.970 |

## Zone Types

- **commercial** - Business/commercial areas
- **residential** - Residential neighborhoods
- **government** - Government buildings/areas
- **mixed** - Mixed-use zones

---
*Last updated: 2026-01-13*
