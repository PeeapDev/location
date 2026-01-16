-- ============================================================================
-- SIERRA LEONE POSTAL ZONES - COMPREHENSIVE GENERATION SCRIPT
-- ============================================================================
-- This script generates all postal zones for Sierra Leone with:
-- - Proper numeric postal codes (XYZZ format)
-- - Center point coordinates (lat/lng)
-- - Polygon geometry for spatial queries
-- - Zone names based on actual localities
-- ============================================================================

-- Clear existing zones (careful - this deletes all zone data!)
-- First remove any addresses that reference zones
DELETE FROM addresses WHERE zone_code IS NOT NULL;
DELETE FROM postal_zones;

-- ============================================================================
-- WESTERN AREA URBAN (WU) - Numeric Code: 11 - Postal Range: 1100-1199
-- Capital: Freetown
-- ============================================================================

-- Central Business District zones (1100-1109)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1100-001', '1100', '001', 1, 'Western Area', 1, 'Western Area Urban', 'Central Freetown CBD', 'commercial',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.240 8.475, -13.228 8.492, -13.218 8.488, -13.215 8.478, -13.222 8.470, -13.235 8.468, -13.240 8.475))'), 4326)),
('1100-002', '1100', '002', 1, 'Western Area', 1, 'Western Area Urban', 'Tower Hill', 'government',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.238 8.482, -13.230 8.490, -13.222 8.486, -13.225 8.478, -13.232 8.475, -13.238 8.482))'), 4326)),
('1100-003', '1100', '003', 1, 'Western Area', 1, 'Western Area Urban', 'Siaka Stevens Street', 'commercial',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.235 8.478, -13.225 8.485, -13.218 8.480, -13.222 8.472, -13.230 8.470, -13.235 8.478))'), 4326));

-- Cline Town / East End (1101)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1101-001', '1101', '001', 1, 'Western Area', 1, 'Western Area Urban', 'Cline Town', 'mixed',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.210 8.478, -13.198 8.492, -13.185 8.485, -13.188 8.470, -13.200 8.465, -13.212 8.472, -13.210 8.478))'), 4326)),
('1101-002', '1101', '002', 1, 'Western Area', 1, 'Western Area Urban', 'East End', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.205 8.485, -13.195 8.495, -13.185 8.488, -13.190 8.478, -13.200 8.475, -13.205 8.485))'), 4326)),
('1101-003', '1101', '003', 1, 'Western Area', 1, 'Western Area Urban', 'Fourah Bay', 'mixed',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.215 8.490, -13.205 8.498, -13.195 8.492, -13.200 8.483, -13.210 8.480, -13.215 8.490))'), 4326));

-- Congo Town / Foulah Town (1102)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1102-001', '1102', '001', 1, 'Western Area', 1, 'Western Area Urban', 'Congo Town', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.225 8.492, -13.212 8.502, -13.200 8.495, -13.205 8.485, -13.218 8.482, -13.225 8.492))'), 4326)),
('1102-002', '1102', '002', 1, 'Western Area', 1, 'Western Area Urban', 'Foulah Town', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.232 8.488, -13.220 8.498, -13.210 8.492, -13.215 8.482, -13.228 8.480, -13.232 8.488))'), 4326)),
('1102-003', '1102', '003', 1, 'Western Area', 1, 'Western Area Urban', 'Murray Town', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.278 8.475, -13.262 8.480, -13.255 8.470, -13.260 8.458, -13.275 8.455, -13.278 8.475))'), 4326));

-- Brookfields / New England (1103)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1103-001', '1103', '001', 1, 'Western Area', 1, 'Western Area Urban', 'Brookfields', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.258 8.468, -13.242 8.472, -13.235 8.462, -13.240 8.450, -13.255 8.448, -13.258 8.468))'), 4326)),
('1103-002', '1103', '002', 1, 'Western Area', 1, 'Western Area Urban', 'New England', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.250 8.475, -13.238 8.480, -13.230 8.470, -13.235 8.460, -13.248 8.458, -13.250 8.475))'), 4326)),
('1103-003', '1103', '003', 1, 'Western Area', 1, 'Western Area Urban', 'Tengbeh Town', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.255 8.485, -13.240 8.490, -13.232 8.480, -13.238 8.468, -13.252 8.465, -13.255 8.485))'), 4326));

-- Hill Station / Wilberforce (1104)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1104-001', '1104', '001', 1, 'Western Area', 1, 'Western Area Urban', 'Hill Station', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.278 8.458, -13.262 8.465, -13.252 8.455, -13.258 8.442, -13.272 8.438, -13.278 8.458))'), 4326)),
('1104-002', '1104', '002', 1, 'Western Area', 1, 'Western Area Urban', 'Wilberforce', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.282 8.448, -13.268 8.455, -13.258 8.445, -13.265 8.432, -13.280 8.428, -13.282 8.448))'), 4326)),
('1104-003', '1104', '003', 1, 'Western Area', 1, 'Western Area Urban', 'Signal Hill', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.290 8.442, -13.275 8.450, -13.265 8.440, -13.272 8.428, -13.288 8.425, -13.290 8.442))'), 4326));

-- Lumley / Aberdeen (1105)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1105-001', '1105', '001', 1, 'Western Area', 1, 'Western Area Urban', 'Lumley', 'mixed',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.298 8.438, -13.282 8.445, -13.275 8.435, -13.280 8.422, -13.295 8.418, -13.298 8.438))'), 4326)),
('1105-002', '1105', '002', 1, 'Western Area', 1, 'Western Area Urban', 'Aberdeen', 'mixed',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.305 8.425, -13.290 8.432, -13.282 8.422, -13.288 8.408, -13.302 8.405, -13.305 8.425))'), 4326)),
('1105-003', '1105', '003', 1, 'Western Area', 1, 'Western Area Urban', 'Cockle Bay', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.320 8.418, -13.305 8.425, -13.295 8.415, -13.302 8.402, -13.318 8.398, -13.320 8.418))'), 4326));

-- Goderich / Juba (1106)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1106-001', '1106', '001', 1, 'Western Area', 1, 'Western Area Urban', 'Goderich', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.330 8.412, -13.315 8.420, -13.305 8.410, -13.312 8.395, -13.328 8.392, -13.330 8.412))'), 4326)),
('1106-002', '1106', '002', 1, 'Western Area', 1, 'Western Area Urban', 'Juba', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.315 8.450, -13.298 8.458, -13.290 8.448, -13.295 8.435, -13.312 8.432, -13.315 8.450))'), 4326)),
('1106-003', '1106', '003', 1, 'Western Area', 1, 'Western Area Urban', 'Lakka', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.340 8.395, -13.325 8.402, -13.315 8.392, -13.322 8.378, -13.338 8.375, -13.340 8.395))'), 4326));

-- Kissy (1107)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1107-001', '1107', '001', 1, 'Western Area', 1, 'Western Area Urban', 'Kissy', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.198 8.495, -13.182 8.500, -13.172 8.490, -13.175 8.478, -13.188 8.472, -13.198 8.495))'), 4326)),
('1107-002', '1107', '002', 1, 'Western Area', 1, 'Western Area Urban', 'Kissy Brook', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.192 8.480, -13.178 8.485, -13.168 8.475, -13.172 8.462, -13.185 8.458, -13.192 8.480))'), 4326)),
('1107-003', '1107', '003', 1, 'Western Area', 1, 'Western Area Urban', 'Kissy Mess Mess', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.185 8.462, -13.172 8.468, -13.162 8.458, -13.168 8.445, -13.180 8.442, -13.185 8.462))'), 4326));

-- Wellington (1108)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1108-001', '1108', '001', 1, 'Western Area', 1, 'Western Area Urban', 'Wellington', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.178 8.495, -13.162 8.500, -13.150 8.490, -13.155 8.478, -13.168 8.472, -13.178 8.495))'), 4326)),
('1108-002', '1108', '002', 1, 'Western Area', 1, 'Western Area Urban', 'Portee', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.168 8.498, -13.152 8.505, -13.142 8.495, -13.148 8.482, -13.160 8.478, -13.168 8.498))'), 4326));

-- Calaba Town (1109)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1109-001', '1109', '001', 1, 'Western Area', 1, 'Western Area Urban', 'Calaba Town', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.158 8.505, -13.142 8.512, -13.132 8.502, -13.138 8.488, -13.150 8.485, -13.158 8.505))'), 4326)),
('1109-002', '1109', '002', 1, 'Western Area', 1, 'Western Area Urban', 'Allen Town', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.148 8.510, -13.132 8.518, -13.122 8.508, -13.128 8.495, -13.140 8.490, -13.148 8.510))'), 4326));

-- Kingtom / Kroo Town (1110)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1110-001', '1110', '001', 1, 'Western Area', 1, 'Western Area Urban', 'Kingtom', 'mixed',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.268 8.488, -13.252 8.492, -13.245 8.482, -13.250 8.470, -13.265 8.468, -13.268 8.488))'), 4326)),
('1110-002', '1110', '002', 1, 'Western Area', 1, 'Western Area Urban', 'Kroo Town', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.220 8.505, -13.205 8.510, -13.195 8.500, -13.200 8.488, -13.215 8.485, -13.220 8.505))'), 4326));

-- ============================================================================
-- WESTERN AREA RURAL (WR) - Numeric Code: 10 - Postal Range: 1000-1099
-- ============================================================================

-- Waterloo (1000)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1000-001', '1000', '001', 1, 'Western Area', 0, 'Western Area Rural', 'Waterloo Town', 'mixed',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.075 8.340, -13.055 8.350, -13.045 8.335, -13.055 8.320, -13.072 8.318, -13.075 8.340))'), 4326)),
('1000-002', '1000', '002', 1, 'Western Area', 0, 'Western Area Rural', 'Waterloo Junction', 'commercial',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.068 8.335, -13.052 8.342, -13.045 8.330, -13.055 8.318, -13.068 8.320, -13.068 8.335))'), 4326));

-- Newton (1001)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1001-001', '1001', '001', 1, 'Western Area', 0, 'Western Area Rural', 'Newton', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.092 8.372, -13.072 8.380, -13.062 8.368, -13.070 8.352, -13.088 8.350, -13.092 8.372))'), 4326));

-- Hastings (1002)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1002-001', '1002', '001', 1, 'Western Area', 0, 'Western Area Rural', 'Hastings', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.140 8.380, -13.120 8.390, -13.110 8.378, -13.118 8.362, -13.138 8.360, -13.140 8.380))'), 4326));

-- Grafton (1003)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1003-001', '1003', '001', 1, 'Western Area', 0, 'Western Area Rural', 'Grafton', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.160 8.395, -13.142 8.405, -13.132 8.392, -13.142 8.378, -13.158 8.375, -13.160 8.395))'), 4326));

-- Regent (1004)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1004-001', '1004', '001', 1, 'Western Area', 0, 'Western Area Rural', 'Regent', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.225 8.420, -13.208 8.430, -13.198 8.418, -13.205 8.402, -13.222 8.400, -13.225 8.420))'), 4326));

-- Leicester (1005)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1005-001', '1005', '001', 1, 'Western Area', 0, 'Western Area Rural', 'Leicester', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.210 8.445, -13.192 8.455, -13.182 8.442, -13.190 8.428, -13.208 8.425, -13.210 8.445))'), 4326));

-- Gloucester (1006)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1006-001', '1006', '001', 1, 'Western Area', 0, 'Western Area Rural', 'Gloucester', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.235 8.440, -13.218 8.450, -13.208 8.438, -13.215 8.422, -13.232 8.420, -13.235 8.440))'), 4326));

-- York (1007)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1007-001', '1007', '001', 1, 'Western Area', 0, 'Western Area Rural', 'York', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.308 8.365, -13.290 8.375, -13.280 8.362, -13.288 8.348, -13.305 8.345, -13.308 8.365))'), 4326));

-- Tombo (1008)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('1008-001', '1008', '001', 1, 'Western Area', 0, 'Western Area Rural', 'Tombo', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.118 8.215, -13.100 8.225, -13.090 8.212, -13.098 8.198, -13.115 8.195, -13.118 8.215))'), 4326));

-- ============================================================================
-- NORTHERN PROVINCE - BOMBALI (NBO) - Numeric Code: 21 - Postal Range: 2100-2199
-- Capital: Makeni
-- ============================================================================

INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('2100-001', '2100', '001', 2, 'Northern Province', 1, 'Bombali', 'Makeni City Center', 'commercial',
 ST_SetSRID(ST_GeomFromText('POLYGON((-12.065 8.895, -12.045 8.905, -12.035 8.892, -12.045 8.878, -12.062 8.875, -12.065 8.895))'), 4326)),
('2100-002', '2100', '002', 2, 'Northern Province', 1, 'Bombali', 'Makeni Teko', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-12.058 8.880, -12.040 8.890, -12.030 8.878, -12.040 8.865, -12.055 8.862, -12.058 8.880))'), 4326)),
('2101-001', '2101', '001', 2, 'Northern Province', 1, 'Bombali', 'Kamabai', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-12.182 9.118, -12.162 9.128, -12.152 9.115, -12.162 9.102, -12.180 9.100, -12.182 9.118))'), 4326)),
('2102-001', '2102', '001', 2, 'Northern Province', 1, 'Bombali', 'Binkolo', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-12.048 9.012, -12.028 9.022, -12.018 9.010, -12.028 8.998, -12.045 8.995, -12.048 9.012))'), 4326));

-- ============================================================================
-- NORTHERN PROVINCE - FALABA (NFA) - Numeric Code: 22 - Postal Range: 2200-2299
-- Capital: Falaba
-- ============================================================================

INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('2200-001', '2200', '001', 2, 'Northern Province', 2, 'Falaba', 'Falaba Town', 'mixed',
 ST_SetSRID(ST_GeomFromText('POLYGON((-11.332 9.862, -11.312 9.872, -11.302 9.858, -11.312 9.845, -11.330 9.842, -11.332 9.862))'), 4326)),
('2201-001', '2201', '001', 2, 'Northern Province', 2, 'Falaba', 'Mongo', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-11.318 9.775, -11.298 9.785, -11.288 9.772, -11.298 9.758, -11.315 9.755, -11.318 9.775))'), 4326));

-- ============================================================================
-- NORTHERN PROVINCE - KOINADUGU (NKO) - Numeric Code: 23 - Postal Range: 2300-2399
-- Capital: Kabala
-- ============================================================================

INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('2300-001', '2300', '001', 2, 'Northern Province', 3, 'Koinadugu', 'Kabala Town', 'mixed',
 ST_SetSRID(ST_GeomFromText('POLYGON((-11.565 9.595, -11.545 9.605, -11.535 9.592, -11.545 9.578, -11.562 9.575, -11.565 9.595))'), 4326)),
('2301-001', '2301', '001', 2, 'Northern Province', 3, 'Koinadugu', 'Yogomaia', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-11.480 9.518, -11.460 9.528, -11.450 9.515, -11.460 9.502, -11.478 9.500, -11.480 9.518))'), 4326));

-- ============================================================================
-- NORTHERN PROVINCE - TONKOLILI (NTO) - Numeric Code: 24 - Postal Range: 2400-2499
-- Capital: Magburaka
-- ============================================================================

INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('2400-001', '2400', '001', 2, 'Northern Province', 4, 'Tonkolili', 'Magburaka Town', 'mixed',
 ST_SetSRID(ST_GeomFromText('POLYGON((-11.965 8.725, -11.945 8.735, -11.935 8.722, -11.945 8.708, -11.962 8.705, -11.965 8.725))'), 4326)),
('2401-001', '2401', '001', 2, 'Northern Province', 4, 'Tonkolili', 'Yele', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-11.845 8.545, -11.825 8.555, -11.815 8.542, -11.825 8.528, -11.842 8.525, -11.845 8.545))'), 4326)),
('2402-001', '2402', '001', 2, 'Northern Province', 4, 'Tonkolili', 'Mile 91', 'commercial',
 ST_SetSRID(ST_GeomFromText('POLYGON((-12.098 8.468, -12.078 8.478, -12.068 8.465, -12.078 8.452, -12.095 8.450, -12.098 8.468))'), 4326));

-- ============================================================================
-- NORTHERN PROVINCE - KARENE (NKA) - Numeric Code: 25 - Postal Range: 2500-2599
-- Capital: Kamakwie
-- ============================================================================

INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('2500-001', '2500', '001', 2, 'Northern Province', 5, 'Karene', 'Kamakwie', 'mixed',
 ST_SetSRID(ST_GeomFromText('POLYGON((-12.248 9.498, -12.228 9.508, -12.218 9.495, -12.228 9.482, -12.245 9.480, -12.248 9.498))'), 4326));

-- ============================================================================
-- NORTH WEST PROVINCE - KAMBIA (NWKM) - Numeric Code: 31 - Postal Range: 3100-3199
-- Capital: Kambia
-- ============================================================================

INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('3100-001', '3100', '001', 3, 'North West Province', 1, 'Kambia', 'Kambia Town', 'mixed',
 ST_SetSRID(ST_GeomFromText('POLYGON((-12.932 9.132, -12.912 9.142, -12.902 9.128, -12.912 9.115, -12.930 9.112, -12.932 9.132))'), 4326)),
('3101-001', '3101', '001', 3, 'North West Province', 1, 'Kambia', 'Rokupr', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-12.965 9.042, -12.945 9.052, -12.935 9.038, -12.945 9.025, -12.962 9.022, -12.965 9.042))'), 4326));

-- ============================================================================
-- NORTH WEST PROVINCE - PORT LOKO (NWPL) - Numeric Code: 32 - Postal Range: 3200-3299
-- Capital: Port Loko
-- ============================================================================

INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('3200-001', '3200', '001', 3, 'North West Province', 2, 'Port Loko', 'Port Loko Town', 'mixed',
 ST_SetSRID(ST_GeomFromText('POLYGON((-12.798 8.775, -12.778 8.785, -12.768 8.772, -12.778 8.758, -12.795 8.755, -12.798 8.775))'), 4326)),
('3201-001', '3201', '001', 3, 'North West Province', 2, 'Port Loko', 'Lunsar', 'commercial',
 ST_SetSRID(ST_GeomFromText('POLYGON((-12.548 8.688, -12.528 8.698, -12.518 8.685, -12.528 8.672, -12.545 8.670, -12.548 8.688))'), 4326)),
('3202-001', '3202', '001', 3, 'North West Province', 2, 'Port Loko', 'Lungi', 'mixed',
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.205 8.618, -13.185 8.628, -13.175 8.615, -13.185 8.602, -13.202 8.600, -13.205 8.618))'), 4326));

-- ============================================================================
-- SOUTHERN PROVINCE - BO (SBO) - Numeric Code: 41 - Postal Range: 4100-4199
-- Capital: Bo
-- ============================================================================

INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('4100-001', '4100', '001', 4, 'Southern Province', 1, 'Bo', 'Bo City Center', 'commercial',
 ST_SetSRID(ST_GeomFromText('POLYGON((-11.752 7.972, -11.732 7.982, -11.722 7.968, -11.732 7.955, -11.750 7.952, -11.752 7.972))'), 4326)),
('4100-002', '4100', '002', 4, 'Southern Province', 1, 'Bo', 'Bo New London', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-11.745 7.958, -11.725 7.968, -11.715 7.955, -11.725 7.942, -11.742 7.940, -11.745 7.958))'), 4326)),
('4101-001', '4101', '001', 4, 'Southern Province', 1, 'Bo', 'Koribondo', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-11.548 7.712, -11.528 7.722, -11.518 7.708, -11.528 7.695, -11.545 7.692, -11.548 7.712))'), 4326));

-- ============================================================================
-- SOUTHERN PROVINCE - BONTHE (SBN) - Numeric Code: 42 - Postal Range: 4200-4299
-- Capital: Bonthe (Sherbro Island)
-- ============================================================================

INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('4200-001', '4200', '001', 4, 'Southern Province', 2, 'Bonthe', 'Bonthe Town', 'mixed',
 ST_SetSRID(ST_GeomFromText('POLYGON((-12.515 7.542, -12.495 7.552, -12.485 7.538, -12.495 7.525, -12.512 7.522, -12.515 7.542))'), 4326)),
('4201-001', '4201', '001', 4, 'Southern Province', 2, 'Bonthe', 'Mattru Jong', 'mixed',
 ST_SetSRID(ST_GeomFromText('POLYGON((-11.848 7.628, -11.828 7.638, -11.818 7.625, -11.828 7.612, -11.845 7.610, -11.848 7.628))'), 4326));

-- ============================================================================
-- SOUTHERN PROVINCE - MOYAMBA (SMO) - Numeric Code: 43 - Postal Range: 4300-4399
-- Capital: Moyamba
-- ============================================================================

INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('4300-001', '4300', '001', 4, 'Southern Province', 3, 'Moyamba', 'Moyamba Town', 'mixed',
 ST_SetSRID(ST_GeomFromText('POLYGON((-12.445 8.168, -12.425 8.178, -12.415 8.165, -12.425 8.152, -12.442 8.150, -12.445 8.168))'), 4326)),
('4301-001', '4301', '001', 4, 'Southern Province', 3, 'Moyamba', 'Shenge', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-12.802 7.892, -12.782 7.902, -12.772 7.888, -12.782 7.875, -12.800 7.872, -12.802 7.892))'), 4326));

-- ============================================================================
-- SOUTHERN PROVINCE - PUJEHUN (SPU) - Numeric Code: 44 - Postal Range: 4400-4499
-- Capital: Pujehun
-- ============================================================================

INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('4400-001', '4400', '001', 4, 'Southern Province', 4, 'Pujehun', 'Pujehun Town', 'mixed',
 ST_SetSRID(ST_GeomFromText('POLYGON((-11.732 7.358, -11.712 7.368, -11.702 7.355, -11.712 7.342, -11.730 7.340, -11.732 7.358))'), 4326)),
('4401-001', '4401', '001', 4, 'Southern Province', 4, 'Pujehun', 'Zimmi', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-11.372 7.298, -11.352 7.308, -11.342 7.295, -11.352 7.282, -11.370 7.280, -11.372 7.298))'), 4326));

-- ============================================================================
-- EASTERN PROVINCE - KAILAHUN (EKL) - Numeric Code: 51 - Postal Range: 5100-5199
-- Capital: Kailahun
-- ============================================================================

INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('5100-001', '5100', '001', 5, 'Eastern Province', 1, 'Kailahun', 'Kailahun Town', 'mixed',
 ST_SetSRID(ST_GeomFromText('POLYGON((-10.588 8.285, -10.568 8.295, -10.558 8.282, -10.568 8.268, -10.585 8.265, -10.588 8.285))'), 4326)),
('5101-001', '5101', '001', 5, 'Eastern Province', 1, 'Kailahun', 'Pendembu', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-10.718 8.098, -10.698 8.108, -10.688 8.095, -10.698 8.082, -10.715 8.080, -10.718 8.098))'), 4326)),
('5102-001', '5102', '001', 5, 'Eastern Province', 1, 'Kailahun', 'Segbwema', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-10.958 7.998, -10.938 8.008, -10.928 7.995, -10.938 7.982, -10.955 7.980, -10.958 7.998))'), 4326));

-- ============================================================================
-- EASTERN PROVINCE - KENEMA (EKE) - Numeric Code: 52 - Postal Range: 5200-5299
-- Capital: Kenema
-- ============================================================================

INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('5200-001', '5200', '001', 5, 'Eastern Province', 2, 'Kenema', 'Kenema City Center', 'commercial',
 ST_SetSRID(ST_GeomFromText('POLYGON((-11.205 7.885, -11.185 7.895, -11.175 7.882, -11.185 7.868, -11.202 7.865, -11.205 7.885))'), 4326)),
('5200-002', '5200', '002', 5, 'Eastern Province', 2, 'Kenema', 'Kenema Nyandehun', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-11.198 7.870, -11.178 7.880, -11.168 7.867, -11.178 7.854, -11.195 7.852, -11.198 7.870))'), 4326)),
('5201-001', '5201', '001', 5, 'Eastern Province', 2, 'Kenema', 'Blama', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-11.145 7.888, -11.125 7.898, -11.115 7.885, -11.125 7.872, -11.142 7.870, -11.145 7.888))'), 4326)),
('5202-001', '5202', '001', 5, 'Eastern Province', 2, 'Kenema', 'Panguma', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-11.178 8.008, -11.158 8.018, -11.148 8.005, -11.158 7.992, -11.175 7.990, -11.178 8.008))'), 4326));

-- ============================================================================
-- EASTERN PROVINCE - KONO (EKN) - Numeric Code: 53 - Postal Range: 5300-5399
-- Capital: Koidu (Sefadu)
-- ============================================================================

INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type, geometry) VALUES
('5300-001', '5300', '001', 5, 'Eastern Province', 3, 'Kono', 'Koidu City Center', 'commercial',
 ST_SetSRID(ST_GeomFromText('POLYGON((-10.982 8.652, -10.962 8.662, -10.952 8.648, -10.962 8.635, -10.980 8.632, -10.982 8.652))'), 4326)),
('5300-002', '5300', '002', 5, 'Eastern Province', 3, 'Kono', 'Koidu New Sembehun', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-10.975 8.638, -10.955 8.648, -10.945 8.635, -10.955 8.622, -10.972 8.620, -10.975 8.638))'), 4326)),
('5301-001', '5301', '001', 5, 'Eastern Province', 3, 'Kono', 'Yengema', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-10.998 8.598, -10.978 8.608, -10.968 8.595, -10.978 8.582, -10.995 8.580, -10.998 8.598))'), 4326)),
('5302-001', '5302', '001', 5, 'Eastern Province', 3, 'Kono', 'Tombodu', 'residential',
 ST_SetSRID(ST_GeomFromText('POLYGON((-10.858 8.712, -10.838 8.722, -10.828 8.708, -10.838 8.695, -10.855 8.692, -10.858 8.712))'), 4326));

-- ============================================================================
-- CREATE INDEXES AND VERIFY
-- ============================================================================

-- Ensure spatial index exists
CREATE INDEX IF NOT EXISTS idx_postal_zones_geometry ON postal_zones USING GIST (geometry);

-- Summary of generated zones
SELECT
    region_name,
    district_name,
    COUNT(*) as zone_count,
    STRING_AGG(DISTINCT LEFT(zone_code, 4), ', ' ORDER BY LEFT(zone_code, 4)) as postal_codes
FROM postal_zones
GROUP BY region_code, region_name, district_code, district_name
ORDER BY region_code, district_code;
