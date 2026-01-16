-- Migration: Add POIs (Points of Interest) table
-- This table stores imported locations from OpenStreetMap with Plus Codes

CREATE TABLE IF NOT EXISTS pois (
    id SERIAL PRIMARY KEY,
    osm_id BIGINT UNIQUE,
    osm_type VARCHAR(10),  -- 'node', 'way', 'relation'
    name VARCHAR(255),
    name_local VARCHAR(255),  -- Local language name
    category VARCHAR(50) NOT NULL,  -- Main category: healthcare, education, shopping, etc.
    subcategory VARCHAR(100),  -- Specific type: hospital, school, restaurant, etc.
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    plus_code VARCHAR(15),  -- Full Plus Code (e.g., 6CW8FQM8+J7W)
    plus_code_short VARCHAR(10),  -- Short Plus Code relative to zone
    zone_code VARCHAR(8) REFERENCES postal_zones(zone_code),
    street_name VARCHAR(255),
    house_number VARCHAR(50),
    phone VARCHAR(50),
    website VARCHAR(500),
    opening_hours VARCHAR(255),
    tags JSONB,  -- All original OSM tags
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_pois_category ON pois(category);
CREATE INDEX IF NOT EXISTS idx_pois_subcategory ON pois(subcategory);
CREATE INDEX IF NOT EXISTS idx_pois_zone_code ON pois(zone_code);
CREATE INDEX IF NOT EXISTS idx_pois_plus_code ON pois(plus_code);
CREATE INDEX IF NOT EXISTS idx_pois_name ON pois(name);
CREATE INDEX IF NOT EXISTS idx_pois_osm_id ON pois(osm_id);

-- Spatial index for nearby queries (requires PostGIS)
CREATE INDEX IF NOT EXISTS idx_pois_location ON pois USING GIST (
    ST_SetSRID(ST_MakePoint(longitude::float, latitude::float), 4326)
);

-- Full text search index for name
CREATE INDEX IF NOT EXISTS idx_pois_name_search ON pois USING GIN (to_tsvector('english', COALESCE(name, '')));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pois_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pois_updated_at ON pois;
CREATE TRIGGER trigger_pois_updated_at
    BEFORE UPDATE ON pois
    FOR EACH ROW
    EXECUTE FUNCTION update_pois_updated_at();

-- Comments
COMMENT ON TABLE pois IS 'Points of Interest imported from OpenStreetMap';
COMMENT ON COLUMN pois.osm_id IS 'OpenStreetMap node/way/relation ID';
COMMENT ON COLUMN pois.category IS 'Main category: healthcare, education, shopping, food, transport, tourism, government, finance, religious';
COMMENT ON COLUMN pois.plus_code IS 'Google Plus Code (Open Location Code) for this location';
COMMENT ON COLUMN pois.tags IS 'Original OSM tags as JSON';
