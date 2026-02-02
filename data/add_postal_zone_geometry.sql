-- Add geometry to postal_zones for Freetown areas
-- These are simplified polygons around each neighborhood for auto-registration

-- Central Freetown / CBD (1100)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.240 8.475, -13.228 8.492, -13.218 8.488, -13.215 8.478, -13.222 8.470, -13.235 8.468, -13.240 8.475))'
), 4326) WHERE zone_code LIKE '1100-%';

-- Cline Town (1101)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.210 8.478, -13.198 8.492, -13.185 8.485, -13.188 8.470, -13.200 8.465, -13.212 8.472, -13.210 8.478))'
), 4326) WHERE zone_code LIKE '1101-%';

-- Fourah Bay (1102)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.222 8.495, -13.208 8.500, -13.198 8.492, -13.202 8.482, -13.215 8.480, -13.225 8.488, -13.222 8.495))'
), 4326) WHERE zone_code LIKE '1102-%';

-- Foulah Town (1103)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.232 8.488, -13.218 8.492, -13.212 8.482, -13.218 8.472, -13.230 8.470, -13.235 8.480, -13.232 8.488))'
), 4326) WHERE zone_code LIKE '1103-%';

-- Grassfield (1104)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.242 8.480, -13.228 8.485, -13.220 8.475, -13.225 8.465, -13.238 8.462, -13.245 8.472, -13.242 8.480))'
), 4326) WHERE zone_code LIKE '1104-%';

-- Magazine (1105)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.225 8.478, -13.212 8.482, -13.202 8.472, -13.208 8.462, -13.220 8.458, -13.228 8.468, -13.225 8.478))'
), 4326) WHERE zone_code LIKE '1105-%';

-- Mamba Ridge (1106)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.215 8.465, -13.202 8.470, -13.192 8.460, -13.198 8.450, -13.210 8.448, -13.218 8.458, -13.215 8.465))'
), 4326) WHERE zone_code LIKE '1106-%';

-- Kissy (1107)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.198 8.495, -13.182 8.500, -13.172 8.490, -13.175 8.478, -13.188 8.472, -13.198 8.485, -13.198 8.495))'
), 4326) WHERE zone_code LIKE '1107-%';

-- Kissy Brook (1108)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.192 8.480, -13.178 8.485, -13.168 8.475, -13.172 8.462, -13.185 8.458, -13.195 8.470, -13.192 8.480))'
), 4326) WHERE zone_code LIKE '1108-%';

-- Kissy Mess Mess (1109)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.185 8.462, -13.172 8.468, -13.162 8.458, -13.168 8.445, -13.180 8.442, -13.188 8.452, -13.185 8.462))'
), 4326) WHERE zone_code LIKE '1109-%';

-- Wellington (1110)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.178 8.495, -13.162 8.500, -13.150 8.490, -13.155 8.478, -13.168 8.472, -13.180 8.485, -13.178 8.495))'
), 4326) WHERE zone_code LIKE '1110-%';

-- Portee (1111)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.168 8.498, -13.152 8.505, -13.142 8.495, -13.148 8.482, -13.160 8.478, -13.170 8.490, -13.168 8.498))'
), 4326) WHERE zone_code LIKE '1111-%';

-- Calaba Town (1112)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.158 8.505, -13.142 8.512, -13.132 8.502, -13.138 8.488, -13.150 8.485, -13.160 8.495, -13.158 8.505))'
), 4326) WHERE zone_code LIKE '1112-%';

-- Allen Town (1113)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.148 8.510, -13.132 8.518, -13.122 8.508, -13.128 8.495, -13.140 8.490, -13.150 8.502, -13.148 8.510))'
), 4326) WHERE zone_code LIKE '1113-%';

-- Grafton (1114)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.138 8.518, -13.122 8.525, -13.112 8.515, -13.118 8.502, -13.130 8.498, -13.140 8.510, -13.138 8.518))'
), 4326) WHERE zone_code LIKE '1114-%';

-- Hastings (1115)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.128 8.525, -13.112 8.530, -13.102 8.520, -13.108 8.508, -13.120 8.505, -13.130 8.518, -13.128 8.525))'
), 4326) WHERE zone_code LIKE '1115-%';

-- Tower Hill (1116)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.245 8.478, -13.232 8.482, -13.225 8.472, -13.230 8.462, -13.242 8.458, -13.250 8.468, -13.245 8.478))'
), 4326) WHERE zone_code LIKE '1116-%';

-- Wilberforce (1117)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.282 8.448, -13.268 8.455, -13.258 8.445, -13.265 8.432, -13.280 8.428, -13.288 8.440, -13.282 8.448))'
), 4326) WHERE zone_code LIKE '1117-%';

-- Signal Hill (1118)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.290 8.442, -13.275 8.450, -13.265 8.440, -13.272 8.428, -13.288 8.425, -13.295 8.435, -13.290 8.442))'
), 4326) WHERE zone_code LIKE '1118-%';

-- Hill Station (1119)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.278 8.458, -13.262 8.465, -13.252 8.455, -13.258 8.442, -13.272 8.438, -13.282 8.450, -13.278 8.458))'
), 4326) WHERE zone_code LIKE '1119-%';

-- Brookfields (1120)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.258 8.468, -13.242 8.472, -13.235 8.462, -13.240 8.450, -13.255 8.448, -13.262 8.458, -13.258 8.468))'
), 4326) WHERE zone_code LIKE '1120-%';

-- Kroo Town (1121)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.220 8.505, -13.205 8.510, -13.195 8.500, -13.200 8.488, -13.215 8.485, -13.225 8.498, -13.220 8.505))'
), 4326) WHERE zone_code LIKE '1121-%';

-- Congo Town (1122)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.262 8.478, -13.248 8.482, -13.240 8.472, -13.245 8.462, -13.258 8.458, -13.265 8.470, -13.262 8.478))'
), 4326) WHERE zone_code LIKE '1122-%';

-- Tengbeh Town (1123)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.255 8.485, -13.240 8.490, -13.232 8.480, -13.238 8.468, -13.252 8.465, -13.260 8.478, -13.255 8.485))'
), 4326) WHERE zone_code LIKE '1123-%';

-- Kingtom (1124)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.268 8.488, -13.252 8.492, -13.245 8.482, -13.250 8.470, -13.265 8.468, -13.272 8.480, -13.268 8.488))'
), 4326) WHERE zone_code LIKE '1124-%';

-- Ascension Town (1125)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.272 8.462, -13.258 8.468, -13.248 8.458, -13.255 8.445, -13.268 8.442, -13.278 8.455, -13.272 8.462))'
), 4326) WHERE zone_code LIKE '1125-%';

-- Aberdeen (1126)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.305 8.425, -13.290 8.432, -13.282 8.422, -13.288 8.408, -13.302 8.405, -13.312 8.418, -13.305 8.425))'
), 4326) WHERE zone_code LIKE '1126-%';

-- Murray Town (1127)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.278 8.475, -13.262 8.480, -13.255 8.470, -13.260 8.458, -13.275 8.455, -13.282 8.468, -13.278 8.475))'
), 4326) WHERE zone_code LIKE '1127-%';

-- Cockle Bay (1128)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.320 8.418, -13.305 8.425, -13.295 8.415, -13.302 8.402, -13.318 8.398, -13.325 8.410, -13.320 8.418))'
), 4326) WHERE zone_code LIKE '1128-%';

-- Lakka (1129)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.340 8.395, -13.325 8.402, -13.315 8.392, -13.322 8.378, -13.338 8.375, -13.345 8.388, -13.340 8.395))'
), 4326) WHERE zone_code LIKE '1129-%';

-- Lumley (1130)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.298 8.438, -13.282 8.445, -13.275 8.435, -13.280 8.422, -13.295 8.418, -13.305 8.430, -13.298 8.438))'
), 4326) WHERE zone_code LIKE '1130-%';

-- Juba (1131)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.315 8.450, -13.298 8.458, -13.290 8.448, -13.295 8.435, -13.312 8.432, -13.320 8.442, -13.315 8.450))'
), 4326) WHERE zone_code LIKE '1131-%';

-- Wilkinson Road (1132)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.268 8.462, -13.252 8.468, -13.245 8.458, -13.250 8.445, -13.265 8.442, -13.272 8.455, -13.268 8.462))'
), 4326) WHERE zone_code LIKE '1132-%';

-- Spur Road (1133)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.275 8.472, -13.258 8.478, -13.250 8.468, -13.255 8.455, -13.272 8.452, -13.280 8.465, -13.275 8.472))'
), 4326) WHERE zone_code LIKE '1133-%';

-- Goderich (1134)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.330 8.412, -13.315 8.420, -13.305 8.410, -13.312 8.395, -13.328 8.392, -13.338 8.405, -13.330 8.412))'
), 4326) WHERE zone_code LIKE '1134-%';

-- Tokeh (1135)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.360 8.375, -13.345 8.382, -13.335 8.372, -13.342 8.358, -13.358 8.355, -13.368 8.368, -13.360 8.375))'
), 4326) WHERE zone_code LIKE '1135-%';

-- Hamilton (1136)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.350 8.388, -13.335 8.395, -13.325 8.385, -13.332 8.370, -13.348 8.368, -13.358 8.380, -13.350 8.388))'
), 4326) WHERE zone_code LIKE '1136-%';

-- Sussex (1137)
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText(
    'POLYGON((-13.375 8.362, -13.360 8.370, -13.350 8.360, -13.358 8.345, -13.375 8.342, -13.385 8.355, -13.375 8.362))'
), 4326) WHERE zone_code LIKE '1137-%';

-- Create spatial index for faster queries
CREATE INDEX IF NOT EXISTS idx_postal_zones_geometry ON postal_zones USING GIST (geometry);

-- Verify the updates
SELECT zone_code, zone_name, geometry IS NOT NULL as has_geometry
FROM postal_zones
WHERE zone_code LIKE '11%'
ORDER BY zone_code;
