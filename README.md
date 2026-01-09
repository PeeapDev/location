# Xeeno Map

National Digital Postal Code and Address System for Sierra Leone.

## Overview

Xeeno Map is a comprehensive postal code and address management system designed for Sierra Leone. It provides:

- **Postal Code System**: 7-character codes (XXXX-YYY) covering all regions
- **Digital Address IDs (PDA-ID)**: Unique, immutable identifiers for every address
- **GPS-based Address Registration**: Register addresses with precise coordinates
- **Address Search & Verification**: APIs for finding and validating addresses
- **Interactive Map Interface**: Web-based map for browsing and registering addresses

## Postal Code Format

```
Format: XXXX-YYY
Example: 2310-047

XXXX = Primary Zone Code
  - 1st digit: Region (1-5)
  - 2nd digit: District (0-9)
  - 3rd-4th: Zone number

YYY = Delivery Segment
  - 001-499: Residential
  - 500-699: Commercial
  - 700-849: Industrial
  - 850-899: Government
  - 950-999: Special (airports, ports)
```

## PDA-ID Format

```
Format: SL-XXXX-YYY-NNNNNN-C
Example: SL-2310-047-000142-7

SL       = Country prefix (Sierra Leone)
XXXX-YYY = Postal zone code
NNNNNN   = Sequential number (000001-999999)
C        = Check digit (Luhn algorithm)
```

## Tech Stack

- **Backend**: Python + FastAPI
- **Database**: PostgreSQL + PostGIS
- **Frontend**: Next.js + TypeScript
- **Maps**: MapLibre GL JS
- **Deployment**: Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/xeeno-map.git
cd xeeno-map
```

2. Start the services:
```bash
docker-compose up -d
```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/address/search` | Search addresses by text |
| GET | `/api/v1/address/{pda_id}` | Get address by PDA-ID |
| POST | `/api/v1/address/register` | Register new address |
| POST | `/api/v1/address/verify` | Verify address validity |
| GET | `/api/v1/address/location/resolve` | Reverse geocode |
| GET | `/api/v1/address/autocomplete` | Address autocomplete |
| GET | `/api/v1/zones` | List postal zones |
| GET | `/api/v1/zones/{code}` | Get zone details |

## Project Structure

```
xeeno-map/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # API routes
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utilities
│   ├── alembic/             # Database migrations
│   └── tests/               # Backend tests
├── frontend/
│   └── src/
│       ├── app/             # Next.js pages
│       ├── components/      # React components
│       ├── lib/             # API client
│       └── types/           # TypeScript types
├── data/
│   └── init.sql             # Database seed data
└── docker-compose.yml
```

## Regions

| Code | Region |
|------|--------|
| 1XXX | Western Area |
| 2XXX | North West |
| 3XXX | North East |
| 4XXX | South |
| 5XXX | East |

## Configuration

Environment variables:

```env
# Backend
DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/xeeno_map
REDIS_URL=redis://redis:6379
SECRET_KEY=your-secret-key

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## License

Copyright 2024 Xeeno Map. All rights reserved.
