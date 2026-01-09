-- Freetown Zone Geometry Updates
-- For zones table used by admin geography module

-- Cline Town - Near the port
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.205 8.485, -13.195 8.49, -13.188 8.482, -13.192 8.472, -13.2 8.468, -13.198 8.478, -13.205 8.485))'), 4326) WHERE primary_code = 'WU-001';

-- Fourah Bay - Historic area
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.235 8.488, -13.225 8.490, -13.218 8.482, -13.222 8.472, -13.232 8.470, -13.238 8.478, -13.235 8.488))'), 4326) WHERE primary_code = 'WU-002';

-- Foulah Town
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.238 8.478, -13.232 8.470, -13.235 8.460, -13.245 8.462, -13.248 8.472, -13.242 8.480, -13.238 8.478))'), 4326) WHERE primary_code = 'WU-003';

-- Grassfield
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.248 8.472, -13.245 8.462, -13.250 8.452, -13.260 8.455, -13.262 8.465, -13.255 8.475, -13.248 8.472))'), 4326) WHERE primary_code = 'WU-004';

-- Magazine
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.222 8.472, -13.218 8.482, -13.208 8.478, -13.205 8.468, -13.212 8.462, -13.220 8.465, -13.222 8.472))'), 4326) WHERE primary_code = 'WU-005';

-- Mamba Ridge
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.212 8.462, -13.205 8.468, -13.195 8.462, -13.198 8.452, -13.208 8.448, -13.215 8.455, -13.212 8.462))'), 4326) WHERE primary_code = 'WU-006';

-- Kissy - Eastern area
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.195 8.490, -13.185 8.495, -13.175 8.488, -13.178 8.475, -13.188 8.472, -13.195 8.482, -13.195 8.490))'), 4326) WHERE primary_code = 'WU-007';

-- Kissy Brook
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.188 8.472, -13.178 8.475, -13.168 8.468, -13.172 8.458, -13.182 8.455, -13.190 8.462, -13.188 8.472))'), 4326) WHERE primary_code = 'WU-008';

-- Kissy Mess Mess
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.182 8.455, -13.172 8.458, -13.165 8.450, -13.170 8.440, -13.180 8.442, -13.185 8.448, -13.182 8.455))'), 4326) WHERE primary_code = 'WU-009';

-- Wellington
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.175 8.488, -13.165 8.492, -13.155 8.485, -13.158 8.472, -13.168 8.468, -13.175 8.478, -13.175 8.488))'), 4326) WHERE primary_code = 'WU-010';

-- Portee
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.165 8.492, -13.155 8.498, -13.145 8.490, -13.148 8.478, -13.155 8.472, -13.160 8.482, -13.165 8.492))'), 4326) WHERE primary_code = 'WU-011';

-- Calaba Town
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.155 8.498, -13.145 8.502, -13.135 8.495, -13.138 8.482, -13.145 8.478, -13.152 8.488, -13.155 8.498))'), 4326) WHERE primary_code = 'WU-012';

-- Allen Town
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.145 8.502, -13.135 8.508, -13.125 8.500, -13.128 8.488, -13.135 8.482, -13.142 8.492, -13.145 8.502))'), 4326) WHERE primary_code = 'WU-013';

-- Grafton
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.135 8.508, -13.125 8.512, -13.115 8.505, -13.118 8.492, -13.125 8.488, -13.132 8.498, -13.135 8.508))'), 4326) WHERE primary_code = 'WU-014';

-- Hastings (further east)
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.125 8.512, -13.115 8.518, -13.105 8.510, -13.108 8.498, -13.115 8.492, -13.122 8.502, -13.125 8.512))'), 4326) WHERE primary_code = 'WU-015';

-- Tower Hill
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.260 8.455, -13.250 8.452, -13.245 8.442, -13.252 8.432, -13.262 8.435, -13.268 8.445, -13.260 8.455))'), 4326) WHERE primary_code = 'WU-016';

-- Wilberforce
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.270 8.445, -13.262 8.435, -13.268 8.425, -13.278 8.420, -13.285 8.430, -13.280 8.442, -13.270 8.445))'), 4326) WHERE primary_code = 'WU-017';

-- Signal Hill
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.285 8.430, -13.278 8.420, -13.282 8.408, -13.295 8.405, -13.302 8.418, -13.295 8.428, -13.285 8.430))'), 4326) WHERE primary_code = 'WU-018';

-- Hill Station
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.268 8.445, -13.262 8.435, -13.252 8.432, -13.255 8.420, -13.268 8.418, -13.275 8.430, -13.268 8.445))'), 4326) WHERE primary_code = 'WU-019';

-- Brookfields
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.252 8.432, -13.245 8.442, -13.235 8.438, -13.232 8.428, -13.240 8.420, -13.252 8.422, -13.252 8.432))'), 4326) WHERE primary_code = 'WU-020';

-- Congo Town
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.262 8.465, -13.255 8.475, -13.245 8.470, -13.242 8.458, -13.250 8.450, -13.260 8.455, -13.262 8.465))'), 4326) WHERE primary_code = 'WU-021';

-- Murray Town
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.275 8.462, -13.268 8.470, -13.258 8.465, -13.255 8.455, -13.262 8.448, -13.272 8.452, -13.275 8.462))'), 4326) WHERE primary_code = 'WU-022';

-- Lumley
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.295 8.428, -13.285 8.430, -13.280 8.418, -13.285 8.405, -13.298 8.402, -13.305 8.415, -13.295 8.428))'), 4326) WHERE primary_code = 'WU-023';

-- Aberdeen
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.305 8.415, -13.298 8.402, -13.302 8.388, -13.318 8.385, -13.325 8.398, -13.318 8.412, -13.305 8.415))'), 4326) WHERE primary_code = 'WU-024';

-- Juba (if exists)
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.318 8.412, -13.325 8.398, -13.335 8.392, -13.345 8.402, -13.340 8.415, -13.328 8.418, -13.318 8.412))'), 4326) WHERE primary_code = 'WU-025';

-- Goderich
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.340 8.415, -13.345 8.402, -13.358 8.395, -13.368 8.405, -13.362 8.420, -13.350 8.422, -13.340 8.415))'), 4326) WHERE primary_code = 'WU-026';

-- Regent
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.252 8.422, -13.240 8.420, -13.235 8.408, -13.242 8.398, -13.255 8.400, -13.260 8.412, -13.252 8.422))'), 4326) WHERE primary_code = 'WU-027';

-- Gloucester
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.260 8.412, -13.255 8.400, -13.262 8.388, -13.275 8.385, -13.280 8.398, -13.272 8.410, -13.260 8.412))'), 4326) WHERE primary_code = 'WU-028';

-- Leicester
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.272 8.410, -13.280 8.398, -13.292 8.395, -13.298 8.408, -13.290 8.418, -13.278 8.415, -13.272 8.410))'), 4326) WHERE primary_code = 'WU-029';

-- Cockerill
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.232 8.428, -13.235 8.438, -13.225 8.442, -13.215 8.435, -13.218 8.422, -13.228 8.420, -13.232 8.428))'), 4326) WHERE primary_code = 'WU-030';

-- New England
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.235 8.438, -13.245 8.442, -13.242 8.455, -13.230 8.458, -13.222 8.450, -13.228 8.440, -13.235 8.438))'), 4326) WHERE primary_code = 'WU-031';

-- Mountain Cut
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.220 8.465, -13.212 8.462, -13.208 8.448, -13.218 8.442, -13.228 8.445, -13.225 8.458, -13.220 8.465))'), 4326) WHERE primary_code = 'WU-032';

-- King Tom
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.245 8.490, -13.235 8.488, -13.232 8.478, -13.242 8.472, -13.252 8.475, -13.255 8.485, -13.245 8.490))'), 4326) WHERE primary_code = 'WU-033';

-- Kroo Bay
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.228 8.490, -13.218 8.492, -13.212 8.485, -13.218 8.475, -13.228 8.472, -13.232 8.482, -13.228 8.490))'), 4326) WHERE primary_code = 'WU-034';

-- Susan's Bay
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.215 8.495, -13.205 8.498, -13.198 8.490, -13.202 8.480, -13.212 8.478, -13.218 8.488, -13.215 8.495))'), 4326) WHERE primary_code = 'WU-035';
