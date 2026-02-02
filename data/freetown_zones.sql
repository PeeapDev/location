-- Freetown Zone Geometry Updates
-- Generated zone boundaries for Western Area Urban

UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.235 8.485, -13.228 8.485, -13.225 8.478, -13.225 8.47, -13.232 8.468, -13.238 8.472, -13.238 8.48, -13.235 8.485))'), 4326) WHERE zone_code = '1100-001';
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.225 8.485, -13.218 8.487, -13.212 8.48, -13.215 8.47, -13.225 8.47, -13.225 8.478, -13.225 8.485))'), 4326) WHERE zone_code = '1100-002';
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.212 8.48, -13.205 8.485, -13.198 8.478, -13.2 8.468, -13.21 8.465, -13.215 8.47, -13.212 8.48))'), 4326) WHERE zone_code = '1101-001';
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.205 8.485, -13.195 8.49, -13.188 8.482, -13.192 8.472, -13.2 8.468, -13.198 8.478, -13.205 8.485))'), 4326) WHERE zone_code = '1101-002';
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.248 8.475, -13.238 8.48, -13.238 8.472, -13.232 8.468, -13.235 8.46, -13.245 8.46, -13.252 8.468, -13.248 8.475))'), 4326) WHERE zone_code = '1102-001';
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.258 8.47, -13.248 8.475, -13.252 8.468, -13.245 8.46, -13.25 8.452, -13.26 8.455, -13.262 8.465, -13.258 8.47))'), 4326) WHERE zone_code = '1102-002';
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.245 8.46, -13.235 8.46, -13.23 8.452, -13.235 8.445, -13.245 8.445, -13.25 8.452, -13.245 8.46))'), 4326) WHERE zone_code = '1103-001';
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.235 8.445, -13.225 8.448, -13.218 8.442, -13.222 8.435, -13.232 8.435, -13.238 8.44, -13.235 8.445))'), 4326) WHERE zone_code = '1103-002';
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.265 8.455, -13.25 8.452, -13.245 8.445, -13.25 8.438, -13.26 8.435, -13.27 8.442, -13.27 8.45, -13.265 8.455))'), 4326) WHERE zone_code = '1104-001';
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.27 8.442, -13.26 8.435, -13.262 8.428, -13.272 8.425, -13.28 8.43, -13.278 8.44, -13.27 8.442))'), 4326) WHERE zone_code = '1104-002';
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.28 8.43, -13.272 8.425, -13.275 8.415, -13.285 8.41, -13.295 8.415, -13.292 8.425, -13.28 8.43))'), 4326) WHERE zone_code = '1105-001';
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.285 8.41, -13.275 8.415, -13.27 8.405, -13.275 8.395, -13.288 8.392, -13.295 8.4, -13.295 8.415, -13.285 8.41))'), 4326) WHERE zone_code = '1105-002';
UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.295 8.4, -13.288 8.392, -13.292 8.382, -13.305 8.378, -13.315 8.385, -13.31 8.395, -13.295 8.4))'), 4326) WHERE zone_code = '1106-001';
