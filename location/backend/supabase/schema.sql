-- Supabase Schema for Sierra Leone Postal Address System
-- Run this in the Supabase SQL Editor

-- Enable PostGIS extension (required for geospatial data)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Plus Code Addresses Table
CREATE TABLE IF NOT EXISTS plus_code_addresses (
    id SERIAL PRIMARY KEY,
    plus_code VARCHAR(15) UNIQUE NOT NULL,
    local_code VARCHAR(4) NOT NULL,
    zone_type VARCHAR(10) NOT NULL CHECK (zone_type IN ('urban', 'rural')),
    center_lat DOUBLE PRECISION NOT NULL,
    center_lon DOUBLE PRECISION NOT NULL,
    geometry GEOMETRY(Polygon, 4326),
    pda_id VARCHAR(21) UNIQUE,  -- Will be assigned when address is registered
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'registered', 'reserved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_pluscode_local ON plus_code_addresses(local_code);
CREATE INDEX IF NOT EXISTS idx_pluscode_zone ON plus_code_addresses(zone_type);
CREATE INDEX IF NOT EXISTS idx_pluscode_status ON plus_code_addresses(status);
CREATE INDEX IF NOT EXISTS idx_pluscode_geometry ON plus_code_addresses USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_pluscode_coords ON plus_code_addresses(center_lat, center_lon);

-- Registered Addresses Table (when someone claims a Plus Code)
CREATE TABLE IF NOT EXISTS registered_addresses (
    pda_id VARCHAR(21) PRIMARY KEY,
    plus_code VARCHAR(15) NOT NULL REFERENCES plus_code_addresses(plus_code),
    zone_code VARCHAR(8) NOT NULL,

    -- Location
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOMETRY(Point, 4326),
    accuracy_m DOUBLE PRECISION,

    -- Address details
    street_name VARCHAR(200),
    block VARCHAR(50),
    house_number VARCHAR(20),
    building_name VARCHAR(200),
    floor VARCHAR(20),
    unit VARCHAR(50),

    -- Landmarks
    landmark_primary TEXT,
    landmark_secondary TEXT,
    delivery_instructions TEXT,

    -- Classification
    address_type VARCHAR(20) DEFAULT 'residential',

    -- Verification
    verification_status VARCHAR(20) DEFAULT 'pending',
    confidence_score DOUBLE PRECISION DEFAULT 0.5,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by VARCHAR(100),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),

    -- Contact
    contact_phone VARCHAR(20),

    -- Extra data
    extra_data JSONB DEFAULT '{}'
);

-- Indexes for registered addresses
CREATE INDEX IF NOT EXISTS idx_registered_zone ON registered_addresses(zone_code);
CREATE INDEX IF NOT EXISTS idx_registered_status ON registered_addresses(verification_status);
CREATE INDEX IF NOT EXISTS idx_registered_location ON registered_addresses USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_registered_street ON registered_addresses(street_name);

-- Postal Zones Table
CREATE TABLE IF NOT EXISTS postal_zones (
    zone_code VARCHAR(8) PRIMARY KEY,
    zone_name VARCHAR(100) NOT NULL,
    district VARCHAR(50),
    region VARCHAR(50),
    zone_type VARCHAR(20) DEFAULT 'urban',
    geometry GEOMETRY(MultiPolygon, 4326),
    center_lat DOUBLE PRECISION,
    center_lon DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zones_geometry ON postal_zones USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_zones_district ON postal_zones(district);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_plus_code_addresses_updated_at ON plus_code_addresses;
CREATE TRIGGER update_plus_code_addresses_updated_at
    BEFORE UPDATE ON plus_code_addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_registered_addresses_updated_at ON registered_addresses;
CREATE TRIGGER update_registered_addresses_updated_at
    BEFORE UPDATE ON registered_addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE plus_code_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE registered_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE postal_zones ENABLE ROW LEVEL SECURITY;

-- Allow public read access to plus_code_addresses
CREATE POLICY "Public read access for plus_code_addresses"
    ON plus_code_addresses FOR SELECT
    USING (true);

-- Allow public read access to postal_zones
CREATE POLICY "Public read access for postal_zones"
    ON postal_zones FOR SELECT
    USING (true);

-- Allow authenticated users to read registered addresses
CREATE POLICY "Authenticated read access for registered_addresses"
    ON registered_addresses FOR SELECT
    USING (true);

-- Service role can do everything (for backend uploads)
CREATE POLICY "Service role full access plus_code_addresses"
    ON plus_code_addresses FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access registered_addresses"
    ON registered_addresses FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access postal_zones"
    ON postal_zones FOR ALL
    USING (auth.role() = 'service_role');

-- View for address statistics
CREATE OR REPLACE VIEW address_stats AS
SELECT
    zone_type,
    status,
    COUNT(*) as count
FROM plus_code_addresses
GROUP BY zone_type, status;

-- Function to find nearest Plus Code to coordinates
CREATE OR REPLACE FUNCTION find_nearest_pluscode(
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    limit_count INTEGER DEFAULT 5
)
RETURNS TABLE(
    plus_code VARCHAR,
    local_code VARCHAR,
    zone_type VARCHAR,
    distance_m DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.plus_code,
        p.local_code,
        p.zone_type,
        ST_Distance(
            ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(p.center_lon, p.center_lat), 4326)::geography
        ) as distance_m
    FROM plus_code_addresses p
    ORDER BY ST_SetSRID(ST_MakePoint(p.center_lon, p.center_lat), 4326) <-> ST_SetSRID(ST_MakePoint(lon, lat), 4326)
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to find Plus Code containing a point
CREATE OR REPLACE FUNCTION find_pluscode_at_point(
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION
)
RETURNS TABLE(
    plus_code VARCHAR,
    local_code VARCHAR,
    zone_type VARCHAR,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.plus_code,
        p.local_code,
        p.zone_type,
        p.status
    FROM plus_code_addresses p
    WHERE ST_Contains(p.geometry, ST_SetSRID(ST_MakePoint(lon, lat), 4326))
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
