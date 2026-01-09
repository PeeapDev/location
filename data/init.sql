-- Xeeno Map Database Initialization
-- PostgreSQL + PostGIS Schema

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create postal_zones table
CREATE TABLE IF NOT EXISTS postal_zones (
    zone_code VARCHAR(8) PRIMARY KEY,
    primary_code VARCHAR(4) NOT NULL,
    segment VARCHAR(3) NOT NULL,
    geometry GEOMETRY(POLYGON, 4326),
    region_code INTEGER NOT NULL CHECK (region_code BETWEEN 1 AND 5),
    region_name VARCHAR(100) NOT NULL,
    district_code INTEGER NOT NULL CHECK (district_code BETWEEN 0 AND 9),
    district_name VARCHAR(100) NOT NULL,
    zone_name VARCHAR(100),
    segment_type VARCHAR(20) DEFAULT 'residential',
    address_sequence INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_zone_code_format CHECK (zone_code ~ '^[0-9]{4}-[0-9]{3}$')
);

-- Create indexes for postal_zones
CREATE INDEX IF NOT EXISTS idx_zones_geom ON postal_zones USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_zones_primary ON postal_zones(primary_code);
CREATE INDEX IF NOT EXISTS idx_zones_region ON postal_zones(region_code);
CREATE INDEX IF NOT EXISTS idx_zones_district ON postal_zones(district_name);

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
    pda_id VARCHAR(21) PRIMARY KEY,
    zone_code VARCHAR(8) NOT NULL REFERENCES postal_zones(zone_code),
    location GEOMETRY(POINT, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    accuracy_m DECIMAL(6,2),
    street_name VARCHAR(200),
    block VARCHAR(50),
    house_number VARCHAR(20),
    building_name VARCHAR(200),
    floor VARCHAR(20),
    unit VARCHAR(50),
    landmark_primary TEXT,
    landmark_secondary TEXT,
    delivery_instructions TEXT,
    access_notes TEXT,
    address_type VARCHAR(20) DEFAULT 'residential',
    subtype VARCHAR(50),
    verification_status VARCHAR(20) DEFAULT 'pending',
    confidence_score DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence_score BETWEEN 0 AND 1),
    verification_method VARCHAR(50),
    verified_at TIMESTAMPTZ,
    verified_by VARCHAR(100),
    contact_phone VARCHAR(20),
    extra_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    CONSTRAINT valid_pda_id_format CHECK (pda_id ~ '^SL-[0-9]{4}-[0-9]{3}-[0-9]{6}-[0-9]$')
);

-- Create indexes for addresses
CREATE INDEX IF NOT EXISTS idx_addresses_geom ON addresses USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_addresses_zone ON addresses(zone_code);
CREATE INDEX IF NOT EXISTS idx_addresses_street ON addresses(street_name);
CREATE INDEX IF NOT EXISTS idx_addresses_status ON addresses(verification_status);
CREATE INDEX IF NOT EXISTS idx_addresses_created ON addresses(created_at);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_addresses_fts ON addresses USING GIN(
    to_tsvector('english', COALESCE(street_name, '') || ' ' || COALESCE(building_name, '') || ' ' || COALESCE(landmark_primary, ''))
);

-- Create address_history table (audit trail)
CREATE TABLE IF NOT EXISTS address_history (
    id BIGSERIAL PRIMARY KEY,
    pda_id VARCHAR(21) NOT NULL REFERENCES addresses(pda_id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changed_by VARCHAR(100),
    change_type VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    request_ip VARCHAR(45),
    request_user_agent VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_history_pda ON address_history(pda_id);
CREATE INDEX IF NOT EXISTS idx_history_changed ON address_history(changed_at);

-- ============================================
-- SEED DATA: Sierra Leone Postal Zones
-- ============================================

-- Western Area (Region 1) - Freetown
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type) VALUES
('1100-001', '1100', '001', 1, 'Western Area', 1, 'Western Area Urban', 'Central Freetown', 'commercial'),
('1100-002', '1100', '002', 1, 'Western Area', 1, 'Western Area Urban', 'Central Freetown East', 'commercial'),
('1101-001', '1101', '001', 1, 'Western Area', 1, 'Western Area Urban', 'East End', 'residential'),
('1101-002', '1101', '002', 1, 'Western Area', 1, 'Western Area Urban', 'Cline Town', 'residential'),
('1102-001', '1102', '001', 1, 'Western Area', 1, 'Western Area Urban', 'Congo Town', 'residential'),
('1102-002', '1102', '002', 1, 'Western Area', 1, 'Western Area Urban', 'Murray Town', 'residential'),
('1103-001', '1103', '001', 1, 'Western Area', 1, 'Western Area Urban', 'Brookfields', 'residential'),
('1103-002', '1103', '002', 1, 'Western Area', 1, 'Western Area Urban', 'New England', 'residential'),
('1104-001', '1104', '001', 1, 'Western Area', 1, 'Western Area Urban', 'Hill Station', 'residential'),
('1104-002', '1104', '002', 1, 'Western Area', 1, 'Western Area Urban', 'Wilberforce', 'residential'),
('1105-001', '1105', '001', 1, 'Western Area', 1, 'Western Area Urban', 'Lumley', 'residential'),
('1105-002', '1105', '002', 1, 'Western Area', 1, 'Western Area Urban', 'Aberdeen', 'residential'),
('1106-001', '1106', '001', 1, 'Western Area', 1, 'Western Area Urban', 'Goderich', 'residential'),
('1120-001', '1120', '001', 1, 'Western Area', 2, 'Western Area Rural', 'Waterloo', 'residential'),
('1120-002', '1120', '002', 1, 'Western Area', 2, 'Western Area Rural', 'Tombo', 'residential'),
('1121-001', '1121', '001', 1, 'Western Area', 2, 'Western Area Rural', 'Newton', 'residential'),
('1122-001', '1122', '001', 1, 'Western Area', 2, 'Western Area Rural', 'Hastings', 'residential'),

-- North West (Region 2)
('2100-001', '2100', '001', 2, 'North West', 1, 'Kambia', 'Kambia Town', 'commercial'),
('2100-002', '2100', '002', 2, 'North West', 1, 'Kambia', 'Kambia Town South', 'residential'),
('2110-001', '2110', '001', 2, 'North West', 1, 'Kambia', 'Rokupr', 'residential'),
('2200-001', '2200', '001', 2, 'North West', 2, 'Port Loko', 'Port Loko Town', 'commercial'),
('2200-002', '2200', '002', 2, 'North West', 2, 'Port Loko', 'Port Loko Central', 'residential'),
('2210-001', '2210', '001', 2, 'North West', 2, 'Port Loko', 'Lunsar', 'residential'),
('2300-001', '2300', '001', 2, 'North West', 3, 'Karene', 'Kamakwie', 'commercial'),
('2300-002', '2300', '002', 2, 'North West', 3, 'Karene', 'Kamakwie East', 'residential'),

-- North East (Region 3)
('3100-001', '3100', '001', 3, 'North East', 1, 'Bombali', 'Makeni Central', 'commercial'),
('3100-002', '3100', '002', 3, 'North East', 1, 'Bombali', 'Makeni West', 'residential'),
('3100-003', '3100', '003', 3, 'North East', 1, 'Bombali', 'Makeni East', 'residential'),
('3100-004', '3100', '004', 3, 'North East', 1, 'Bombali', 'Makeni South', 'residential'),
('3110-001', '3110', '001', 3, 'North East', 1, 'Bombali', 'Magburaka Road', 'residential'),
('3200-001', '3200', '001', 3, 'North East', 2, 'Tonkolili', 'Magburaka', 'commercial'),
('3200-002', '3200', '002', 3, 'North East', 2, 'Tonkolili', 'Magburaka North', 'residential'),
('3210-001', '3210', '001', 3, 'North East', 2, 'Tonkolili', 'Mile 91', 'residential'),
('3300-001', '3300', '001', 3, 'North East', 3, 'Koinadugu', 'Kabala', 'commercial'),
('3300-002', '3300', '002', 3, 'North East', 3, 'Koinadugu', 'Kabala Town', 'residential'),
('3400-001', '3400', '001', 3, 'North East', 4, 'Falaba', 'Falaba Town', 'residential'),

-- South (Region 4)
('4100-001', '4100', '001', 4, 'South', 1, 'Bo', 'Bo Central', 'commercial'),
('4100-002', '4100', '002', 4, 'South', 1, 'Bo', 'Bo Central North', 'commercial'),
('4100-003', '4100', '003', 4, 'South', 1, 'Bo', 'Bo West', 'residential'),
('4100-004', '4100', '004', 4, 'South', 1, 'Bo', 'Bo East', 'residential'),
('4100-005', '4100', '005', 4, 'South', 1, 'Bo', 'Bo South', 'residential'),
('4110-001', '4110', '001', 4, 'South', 1, 'Bo', 'Tikonko', 'residential'),
('4200-001', '4200', '001', 4, 'South', 2, 'Bonthe', 'Bonthe Town', 'commercial'),
('4200-002', '4200', '002', 4, 'South', 2, 'Bonthe', 'Bonthe Island', 'residential'),
('4210-001', '4210', '001', 4, 'South', 2, 'Bonthe', 'Mattru Jong', 'residential'),
('4300-001', '4300', '001', 4, 'South', 3, 'Moyamba', 'Moyamba Town', 'commercial'),
('4300-002', '4300', '002', 4, 'South', 3, 'Moyamba', 'Moyamba Junction', 'residential'),
('4400-001', '4400', '001', 4, 'South', 4, 'Pujehun', 'Pujehun Town', 'commercial'),
('4400-002', '4400', '002', 4, 'South', 4, 'Pujehun', 'Pujehun Central', 'residential'),

-- East (Region 5)
('5100-001', '5100', '001', 5, 'East', 1, 'Kenema', 'Kenema Central', 'commercial'),
('5100-002', '5100', '002', 5, 'East', 1, 'Kenema', 'Kenema Central East', 'commercial'),
('5100-003', '5100', '003', 5, 'East', 1, 'Kenema', 'Kenema West', 'residential'),
('5100-004', '5100', '004', 5, 'East', 1, 'Kenema', 'Kenema East', 'residential'),
('5100-005', '5100', '005', 5, 'East', 1, 'Kenema', 'Kenema South', 'residential'),
('5110-001', '5110', '001', 5, 'East', 1, 'Kenema', 'Blama', 'residential'),
('5200-001', '5200', '001', 5, 'East', 2, 'Kono', 'Koidu Central', 'commercial'),
('5200-002', '5200', '002', 5, 'East', 2, 'Kono', 'Koidu North', 'residential'),
('5200-003', '5200', '003', 5, 'East', 2, 'Kono', 'Koidu South', 'residential'),
('5210-001', '5210', '001', 5, 'East', 2, 'Kono', 'Yengema', 'residential'),
('5300-001', '5300', '001', 5, 'East', 3, 'Kailahun', 'Kailahun Town', 'commercial'),
('5300-002', '5300', '002', 5, 'East', 3, 'Kailahun', 'Kailahun Central', 'residential'),
('5310-001', '5310', '001', 5, 'East', 3, 'Kailahun', 'Segbwema', 'residential'),
('5310-002', '5310', '002', 5, 'East', 3, 'Kailahun', 'Pendembu', 'residential')

ON CONFLICT (zone_code) DO NOTHING;

-- ============================================
-- SAMPLE ADDRESSES (for testing)
-- ============================================

-- Freetown Central addresses
INSERT INTO addresses (pda_id, zone_code, location, latitude, longitude, accuracy_m, street_name, block, building_name, landmark_primary, address_type, verification_status, confidence_score, verification_method) VALUES
('SL-1100-001-000001-4', '1100-001', ST_SetSRID(ST_MakePoint(-13.2317, 8.4840), 4326), 8.4840, -13.2317, 5.0, 'Siaka Stevens Street', 'A', 'State House', 'Government House, Main Entrance', 'government', 'verified', 0.95, 'field_survey'),
('SL-1100-001-000002-2', '1100-001', ST_SetSRID(ST_MakePoint(-13.2312, 8.4835), 4326), 8.4835, -13.2312, 5.0, 'Siaka Stevens Street', 'B', 'Law Courts Building', 'Opposite State House', 'government', 'verified', 0.94, 'field_survey'),
('SL-1100-001-000003-0', '1100-001', ST_SetSRID(ST_MakePoint(-13.2295, 8.4828), 4326), 8.4828, -13.2295, 8.0, 'Rawdon Street', 'C', 'City Hall', 'Near Cotton Tree', 'government', 'verified', 0.92, 'field_survey'),
('SL-1100-001-000004-8', '1100-001', ST_SetSRID(ST_MakePoint(-13.2278, 8.4815), 4326), 8.4815, -13.2278, 6.0, 'Gloucester Street', NULL, NULL, 'Near Big Market', 'commercial', 'verified', 0.88, 'photo_verified'),
('SL-1100-001-000005-6', '1100-001', ST_SetSRID(ST_MakePoint(-13.2265, 8.4808), 4326), 8.4808, -13.2265, 10.0, 'Lightfoot Boston Street', NULL, NULL, 'Near Victoria Park', 'commercial', 'verified', 0.85, 'photo_verified'),

-- Bo addresses
('SL-4100-001-000001-3', '4100-001', ST_SetSRID(ST_MakePoint(-11.7383, 7.9648), 4326), 7.9648, -11.7383, 5.0, 'Bojon Street', 'A', 'Bo City Council', 'Main Administrative Building', 'government', 'verified', 0.93, 'field_survey'),
('SL-4100-001-000002-1', '4100-001', ST_SetSRID(ST_MakePoint(-11.7375, 7.9642), 4326), 7.9642, -11.7375, 6.0, 'Main Street', 'B', NULL, 'Near Central Market', 'commercial', 'verified', 0.90, 'field_survey'),
('SL-4100-001-000003-9', '4100-001', ST_SetSRID(ST_MakePoint(-11.7368, 7.9635), 4326), 7.9635, -11.7368, 8.0, 'Damballa Road', NULL, 'Bo Government Hospital', 'Main Hospital Entrance', 'institutional', 'verified', 0.91, 'field_survey'),

-- Kenema addresses
('SL-5100-001-000001-1', '5100-001', ST_SetSRID(ST_MakePoint(-11.1908, 7.8761), 4326), 7.8761, -11.1908, 5.0, 'Hangha Road', 'A', 'Kenema City Council', 'District Headquarters', 'government', 'verified', 0.94, 'field_survey'),
('SL-5100-001-000002-9', '5100-001', ST_SetSRID(ST_MakePoint(-11.1895, 7.8755), 4326), 7.8755, -11.1895, 7.0, 'Main Motor Road', 'B', NULL, 'Near Kenema Market', 'commercial', 'verified', 0.89, 'photo_verified'),

-- Makeni addresses
('SL-3100-001-000001-8', '3100-001', ST_SetSRID(ST_MakePoint(-12.0442, 8.8833), 4326), 8.8833, -12.0442, 5.0, 'Azzolini Highway', 'A', 'Makeni City Council', 'Administrative Center', 'government', 'verified', 0.93, 'field_survey'),
('SL-3100-001-000002-6', '3100-001', ST_SetSRID(ST_MakePoint(-12.0435, 8.8828), 4326), 8.8828, -12.0435, 6.0, 'Rogbane Road', 'B', 'Holy Spirit Cathedral', 'Main Cathedral', 'institutional', 'verified', 0.92, 'field_survey')

ON CONFLICT (pda_id) DO NOTHING;

-- Update zone address sequences
UPDATE postal_zones SET address_sequence = 5 WHERE zone_code = '1100-001';
UPDATE postal_zones SET address_sequence = 3 WHERE zone_code = '4100-001';
UPDATE postal_zones SET address_sequence = 2 WHERE zone_code = '5100-001';
UPDATE postal_zones SET address_sequence = 2 WHERE zone_code = '3100-001';

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO xeeno;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO xeeno;
