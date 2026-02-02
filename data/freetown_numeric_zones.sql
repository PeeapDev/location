-- Freetown Complete Postal Zones with Numeric Codes
-- Format: ####-NNN (4-digit base + 3-digit extension)
-- Western Area Urban: 1100-1199
-- Western Area Rural: 1000-1099

-- First, clear existing zones for Western Area
DELETE FROM zones WHERE district_id IN (1, 2);

-- Reset the sequence
SELECT setval('zones_id_seq', 1, false);

-- ============================================
-- WESTERN AREA URBAN (District ID: 1)
-- Postal Codes: 1100-1199
-- ============================================

-- Central Business District
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES
(1, '001', '1100', 'Central Freetown CBD', 'commercial', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.235 8.488, -13.228 8.490, -13.222 8.484, -13.225 8.476, -13.232 8.474, -13.238 8.480, -13.235 8.488))'), 4326));

-- Eastern Freetown
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES
(1, '002', '1101', 'Cline Town', 'mixed', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.205 8.485, -13.195 8.490, -13.188 8.482, -13.192 8.472, -13.200 8.468, -13.208 8.478, -13.205 8.485))'), 4326)),

(1, '003', '1102', 'Fourah Bay', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.218 8.492, -13.210 8.495, -13.202 8.488, -13.205 8.480, -13.215 8.478, -13.220 8.485, -13.218 8.492))'), 4326)),

(1, '004', '1103', 'Foulah Town', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.228 8.485, -13.218 8.488, -13.212 8.480, -13.218 8.472, -13.228 8.470, -13.232 8.478, -13.228 8.485))'), 4326)),

(1, '005', '1104', 'Grassfield', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.238 8.478, -13.228 8.482, -13.222 8.474, -13.228 8.466, -13.238 8.464, -13.242 8.472, -13.238 8.478))'), 4326)),

(1, '006', '1105', 'Magazine', 'mixed', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.222 8.474, -13.212 8.478, -13.205 8.470, -13.210 8.462, -13.220 8.460, -13.225 8.468, -13.222 8.474))'), 4326)),

(1, '007', '1106', 'Mamba Ridge', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.210 8.462, -13.200 8.465, -13.192 8.458, -13.198 8.450, -13.208 8.448, -13.215 8.455, -13.210 8.462))'), 4326)),

(1, '008', '1107', 'Kissy', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.195 8.490, -13.185 8.495, -13.175 8.488, -13.178 8.478, -13.188 8.475, -13.195 8.482, -13.195 8.490))'), 4326)),

(1, '009', '1108', 'Kissy Brook', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.188 8.475, -13.178 8.478, -13.168 8.470, -13.172 8.460, -13.182 8.458, -13.190 8.465, -13.188 8.475))'), 4326)),

(1, '010', '1109', 'Kissy Mess Mess', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.182 8.458, -13.172 8.460, -13.165 8.452, -13.170 8.442, -13.180 8.440, -13.185 8.450, -13.182 8.458))'), 4326)),

(1, '011', '1110', 'Kissy Dockyard', 'industrial', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.192 8.472, -13.182 8.475, -13.175 8.468, -13.178 8.458, -13.188 8.455, -13.195 8.465, -13.192 8.472))'), 4326)),

(1, '012', '1111', 'Wellington', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.175 8.488, -13.165 8.492, -13.155 8.485, -13.158 8.475, -13.168 8.472, -13.175 8.480, -13.175 8.488))'), 4326)),

(1, '013', '1112', 'Portee', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.165 8.492, -13.155 8.498, -13.145 8.490, -13.148 8.480, -13.158 8.478, -13.165 8.485, -13.165 8.492))'), 4326)),

(1, '014', '1113', 'Calaba Town', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.155 8.498, -13.145 8.502, -13.135 8.495, -13.138 8.485, -13.148 8.482, -13.155 8.490, -13.155 8.498))'), 4326)),

(1, '015', '1114', 'Allen Town', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.145 8.502, -13.135 8.508, -13.125 8.500, -13.128 8.490, -13.138 8.488, -13.145 8.495, -13.145 8.502))'), 4326)),

(1, '016', '1115', 'Grafton', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.135 8.508, -13.125 8.515, -13.115 8.508, -13.118 8.498, -13.128 8.495, -13.135 8.502, -13.135 8.508))'), 4326)),

(1, '017', '1116', 'Kaningo', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.168 8.472, -13.158 8.475, -13.150 8.468, -13.155 8.458, -13.165 8.455, -13.172 8.465, -13.168 8.472))'), 4326));

-- Central Freetown Areas
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES
(1, '018', '1117', 'Tower Hill', 'government', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.242 8.472, -13.235 8.476, -13.228 8.470, -13.232 8.462, -13.240 8.460, -13.245 8.466, -13.242 8.472))'), 4326)),

(1, '019', '1118', 'Cotton Tree', 'commercial', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.235 8.480, -13.228 8.484, -13.222 8.478, -13.225 8.470, -13.232 8.468, -13.238 8.474, -13.235 8.480))'), 4326)),

(1, '020', '1119', 'Victoria Park', 'mixed', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.232 8.474, -13.225 8.478, -13.218 8.472, -13.222 8.464, -13.230 8.462, -13.235 8.468, -13.232 8.474))'), 4326)),

(1, '021', '1120', 'Pademba Road', 'mixed', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.245 8.466, -13.238 8.470, -13.232 8.464, -13.235 8.456, -13.242 8.454, -13.248 8.460, -13.245 8.466))'), 4326)),

(1, '022', '1121', 'Circular Road', 'commercial', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.238 8.474, -13.232 8.478, -13.225 8.472, -13.228 8.464, -13.236 8.462, -13.242 8.468, -13.238 8.474))'), 4326)),

(1, '023', '1122', 'King Jimmy', 'commercial', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.228 8.490, -13.220 8.494, -13.212 8.488, -13.215 8.480, -13.225 8.478, -13.230 8.484, -13.228 8.490))'), 4326)),

(1, '024', '1123', 'Big Wharf', 'commercial', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.222 8.494, -13.212 8.498, -13.205 8.492, -13.208 8.484, -13.218 8.482, -13.225 8.488, -13.222 8.494))'), 4326)),

(1, '025', '1124', 'Kroo Bay', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.215 8.498, -13.205 8.502, -13.198 8.495, -13.202 8.488, -13.210 8.485, -13.218 8.492, -13.215 8.498))'), 4326)),

(1, '026', '1125', 'Susans Bay', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.208 8.502, -13.198 8.506, -13.190 8.498, -13.195 8.490, -13.205 8.488, -13.210 8.495, -13.208 8.502))'), 4326)),

(1, '027', '1126', 'Moa Wharf', 'industrial', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.200 8.505, -13.190 8.508, -13.182 8.500, -13.188 8.492, -13.198 8.490, -13.205 8.498, -13.200 8.505))'), 4326)),

(1, '028', '1127', 'Crab Town', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.220 8.468, -13.210 8.472, -13.202 8.465, -13.208 8.456, -13.218 8.454, -13.225 8.462, -13.220 8.468))'), 4326)),

(1, '029', '1128', 'Saw Pit', 'mixed', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.232 8.462, -13.225 8.466, -13.218 8.460, -13.222 8.452, -13.230 8.450, -13.235 8.456, -13.232 8.462))'), 4326)),

(1, '030', '1129', 'Up Gun', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.235 8.456, -13.228 8.460, -13.220 8.454, -13.225 8.446, -13.235 8.444, -13.240 8.450, -13.235 8.456))'), 4326)),

(1, '031', '1130', 'Down Gun', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.228 8.460, -13.220 8.464, -13.212 8.458, -13.218 8.450, -13.226 8.448, -13.232 8.454, -13.228 8.460))'), 4326));

-- Western Freetown
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES
(1, '032', '1131', 'Congo Town', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.255 8.472, -13.248 8.476, -13.240 8.470, -13.245 8.462, -13.252 8.460, -13.258 8.466, -13.255 8.472))'), 4326)),

(1, '033', '1132', 'Murray Town', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.268 8.468, -13.258 8.472, -13.252 8.466, -13.255 8.458, -13.265 8.455, -13.272 8.462, -13.268 8.468))'), 4326)),

(1, '034', '1133', 'Brookfields', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.252 8.460, -13.245 8.464, -13.238 8.458, -13.242 8.450, -13.250 8.448, -13.256 8.454, -13.252 8.460))'), 4326)),

(1, '035', '1134', 'New England', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.245 8.450, -13.238 8.454, -13.230 8.448, -13.235 8.440, -13.245 8.438, -13.250 8.444, -13.245 8.450))'), 4326)),

(1, '036', '1135', 'Mountain Cut', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.238 8.454, -13.230 8.458, -13.222 8.452, -13.228 8.444, -13.236 8.442, -13.242 8.448, -13.238 8.454))'), 4326)),

(1, '037', '1136', 'Tengbeh Town', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.248 8.476, -13.240 8.480, -13.232 8.474, -13.238 8.466, -13.246 8.464, -13.252 8.470, -13.248 8.476))'), 4326)),

(1, '038', '1137', 'Kingtom', 'mixed', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.258 8.480, -13.248 8.484, -13.242 8.478, -13.245 8.470, -13.255 8.468, -13.262 8.474, -13.258 8.480))'), 4326)),

(1, '039', '1138', 'Ascension Town', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.265 8.455, -13.258 8.460, -13.250 8.454, -13.255 8.446, -13.262 8.444, -13.268 8.450, -13.265 8.455))'), 4326));

-- Hillside/Elevated Areas
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES
(1, '040', '1139', 'Hill Station', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.272 8.450, -13.262 8.455, -13.255 8.448, -13.260 8.438, -13.270 8.435, -13.278 8.442, -13.272 8.450))'), 4326)),

(1, '041', '1140', 'Wilberforce', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.278 8.442, -13.270 8.448, -13.262 8.442, -13.268 8.432, -13.278 8.428, -13.285 8.436, -13.278 8.442))'), 4326)),

(1, '042', '1141', 'Signal Hill', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.285 8.436, -13.278 8.442, -13.270 8.435, -13.275 8.425, -13.285 8.422, -13.292 8.430, -13.285 8.436))'), 4326)),

(1, '043', '1142', 'Leicester', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.270 8.435, -13.262 8.440, -13.255 8.432, -13.260 8.422, -13.268 8.420, -13.275 8.428, -13.270 8.435))'), 4326)),

(1, '044', '1143', 'Regent', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.260 8.422, -13.252 8.428, -13.245 8.420, -13.250 8.410, -13.260 8.408, -13.265 8.415, -13.260 8.422))'), 4326)),

(1, '045', '1144', 'Gloucester', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.268 8.420, -13.260 8.425, -13.252 8.418, -13.258 8.408, -13.268 8.405, -13.275 8.412, -13.268 8.420))'), 4326)),

(1, '046', '1145', 'Charlotte', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.252 8.418, -13.245 8.422, -13.238 8.415, -13.242 8.405, -13.252 8.402, -13.258 8.410, -13.252 8.418))'), 4326)),

(1, '047', '1146', 'Bathurst', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.275 8.412, -13.268 8.418, -13.260 8.410, -13.265 8.400, -13.275 8.398, -13.282 8.405, -13.275 8.412))'), 4326)),

(1, '048', '1147', 'Leopold', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.265 8.400, -13.258 8.405, -13.250 8.398, -13.255 8.388, -13.265 8.385, -13.272 8.392, -13.265 8.400))'), 4326)),

(1, '049', '1148', 'Babadorie', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.258 8.405, -13.250 8.410, -13.242 8.402, -13.248 8.392, -13.258 8.390, -13.265 8.398, -13.258 8.405))'), 4326)),

(1, '050', '1149', 'Kortright', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.248 8.392, -13.240 8.398, -13.232 8.390, -13.238 8.380, -13.248 8.378, -13.255 8.385, -13.248 8.392))'), 4326)),

(1, '051', '1150', 'Fitzjohn', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.282 8.405, -13.275 8.412, -13.268 8.405, -13.272 8.395, -13.282 8.392, -13.288 8.400, -13.282 8.405))'), 4326));

-- Coastal/Peninsula Areas
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES
(1, '052', '1151', 'Lumley', 'mixed', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.292 8.430, -13.285 8.436, -13.278 8.428, -13.282 8.418, -13.292 8.415, -13.298 8.422, -13.292 8.430))'), 4326)),

(1, '053', '1152', 'Aberdeen', 'mixed', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.298 8.422, -13.292 8.428, -13.285 8.420, -13.290 8.410, -13.300 8.408, -13.305 8.415, -13.298 8.422))'), 4326)),

(1, '054', '1153', 'Juba', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.305 8.415, -13.298 8.420, -13.292 8.412, -13.296 8.402, -13.306 8.400, -13.312 8.408, -13.305 8.415))'), 4326)),

(1, '055', '1154', 'Cockle Bay', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.312 8.408, -13.305 8.415, -13.298 8.408, -13.302 8.398, -13.312 8.395, -13.318 8.402, -13.312 8.408))'), 4326)),

(1, '056', '1155', 'Murray Town Beach', 'mixed', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.275 8.462, -13.268 8.468, -13.260 8.462, -13.265 8.452, -13.275 8.450, -13.280 8.456, -13.275 8.462))'), 4326)),

(1, '057', '1156', 'Lumley Beach', 'commercial', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.300 8.408, -13.292 8.415, -13.285 8.408, -13.290 8.398, -13.300 8.395, -13.306 8.402, -13.300 8.408))'), 4326)),

(1, '058', '1157', 'Aberdeen Beach', 'commercial', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.306 8.402, -13.300 8.408, -13.292 8.400, -13.298 8.390, -13.308 8.388, -13.314 8.395, -13.306 8.402))'), 4326)),

(1, '059', '1158', 'Goderich', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.318 8.402, -13.310 8.408, -13.302 8.400, -13.308 8.390, -13.318 8.388, -13.325 8.395, -13.318 8.402))'), 4326)),

(1, '060', '1159', 'Hamilton', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.325 8.395, -13.318 8.402, -13.310 8.395, -13.315 8.385, -13.325 8.382, -13.332 8.388, -13.325 8.395))'), 4326)),

(1, '061', '1160', 'Lakka', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.332 8.388, -13.325 8.395, -13.318 8.388, -13.322 8.378, -13.332 8.375, -13.338 8.382, -13.332 8.388))'), 4326)),

(1, '062', '1161', 'York', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.338 8.382, -13.332 8.388, -13.325 8.380, -13.330 8.370, -13.340 8.368, -13.345 8.375, -13.338 8.382))'), 4326)),

(1, '063', '1162', 'John Obey', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.345 8.375, -13.338 8.382, -13.330 8.375, -13.335 8.365, -13.345 8.362, -13.352 8.368, -13.345 8.375))'), 4326)),

(1, '064', '1163', 'Tokeh', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.352 8.368, -13.345 8.375, -13.338 8.368, -13.342 8.358, -13.352 8.355, -13.358 8.362, -13.352 8.368))'), 4326)),

(1, '065', '1164', 'River Number Two', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.358 8.362, -13.352 8.368, -13.345 8.360, -13.350 8.350, -13.360 8.348, -13.365 8.355, -13.358 8.362))'), 4326)),

(1, '066', '1165', 'Sussex', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.365 8.355, -13.358 8.362, -13.350 8.355, -13.355 8.345, -13.365 8.342, -13.372 8.348, -13.365 8.355))'), 4326)),

(1, '067', '1166', 'Kent', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.372 8.348, -13.365 8.355, -13.358 8.348, -13.362 8.338, -13.372 8.335, -13.378 8.342, -13.372 8.348))'), 4326)),

(1, '068', '1167', 'Bureh', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.378 8.342, -13.372 8.348, -13.365 8.340, -13.370 8.330, -13.380 8.328, -13.385 8.335, -13.378 8.342))'), 4326));

-- ============================================
-- WESTERN AREA RURAL (District ID: 2)
-- Postal Codes: 1000-1099
-- ============================================

INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES
(2, '001', '1000', 'Waterloo', 'mixed', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.075 8.340, -13.065 8.350, -13.050 8.345, -13.045 8.330, -13.055 8.320, -13.070 8.325, -13.075 8.340))'), 4326)),

(2, '002', '1001', 'Newton', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.090 8.355, -13.080 8.365, -13.065 8.358, -13.062 8.345, -13.075 8.340, -13.088 8.348, -13.090 8.355))'), 4326)),

(2, '003', '1002', 'Hastings', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.125 8.515, -13.115 8.520, -13.105 8.512, -13.108 8.500, -13.118 8.498, -13.125 8.508, -13.125 8.515))'), 4326)),

(2, '004', '1003', 'Jui', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.108 8.385, -13.098 8.392, -13.085 8.385, -13.088 8.372, -13.100 8.368, -13.110 8.375, -13.108 8.385))'), 4326)),

(2, '005', '1004', 'Tombo', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.125 8.395, -13.115 8.402, -13.102 8.395, -13.105 8.382, -13.118 8.378, -13.128 8.385, -13.125 8.395))'), 4326)),

(2, '006', '1005', 'Ogoo Farm', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.095 8.408, -13.085 8.415, -13.072 8.408, -13.075 8.395, -13.088 8.392, -13.098 8.400, -13.095 8.408))'), 4326)),

(2, '007', '1006', 'Kossoh Town', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.078 8.425, -13.068 8.432, -13.055 8.425, -13.058 8.412, -13.070 8.408, -13.080 8.415, -13.078 8.425))'), 4326)),

(2, '008', '1007', 'Teko', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.062 8.380, -13.052 8.388, -13.040 8.380, -13.042 8.368, -13.055 8.365, -13.065 8.372, -13.062 8.380))'), 4326)),

(2, '009', '1008', 'Rokel', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.045 8.395, -13.035 8.402, -13.022 8.395, -13.025 8.382, -13.038 8.378, -13.048 8.385, -13.045 8.395))'), 4326)),

(2, '010', '1009', 'Pepel', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.050 8.450, -13.040 8.458, -13.028 8.450, -13.030 8.438, -13.042 8.435, -13.052 8.442, -13.050 8.450))'), 4326)),

(2, '011', '1010', 'Masiaka Junction', 'commercial', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.015 8.365, -13.005 8.372, -12.992 8.365, -12.995 8.352, -13.008 8.348, -13.018 8.355, -13.015 8.365))'), 4326)),

(2, '012', '1011', 'Mile 91 Junction', 'commercial', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-12.825 8.475, -12.815 8.482, -12.802 8.475, -12.805 8.462, -12.818 8.458, -12.828 8.465, -12.825 8.475))'), 4326)),

(2, '013', '1012', 'Fogbo', 'residential', true, false, 1, 0, NOW(),
 ST_SetSRID(ST_GeomFromText('POLYGON((-13.055 8.425, -13.045 8.432, -13.032 8.425, -13.035 8.412, -13.048 8.408, -13.058 8.415, -13.055 8.425))'), 4326));

-- Verify the insert
SELECT COUNT(*) as total_zones,
       d.name as district
FROM zones z
JOIN districts d ON z.district_id = d.id
GROUP BY d.name;
