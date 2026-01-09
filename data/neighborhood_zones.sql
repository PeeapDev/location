-- Freetown Neighborhood-Based Postal Zones
-- Total zones: 43

-- Clear existing zones for Western Area
DELETE FROM zones WHERE district_id IN (1, 2);

-- Reset sequence
SELECT setval('zones_id_seq', 1, false);

-- Insert neighborhood zones
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '001', '1000', 'Central Freetown', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2365 8.4815, -13.2315 8.4815, -13.2315 8.4865, -13.2365 8.4865, -13.2365 8.4815))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '002', '1001', 'Tower Hill', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.240499999999999 8.4755, -13.2355 8.4755, -13.2355 8.4805, -13.240499999999999 8.4805, -13.240499999999999 8.4755))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '003', '1002', 'Pademba Road', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2305 8.4725, -13.2255 8.4725, -13.2255 8.4775, -13.2305 8.4775, -13.2305 8.4725))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '004', '1003', 'Kroo Town', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2445 8.4695, -13.239500000000001 8.4695, -13.239500000000001 8.474499999999999, -13.2445 8.474499999999999, -13.2445 8.4695))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '005', '1004', 'Magazine Cut', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.237499999999999 8.467500000000001, -13.2325 8.467500000000001, -13.2325 8.4725, -13.237499999999999 8.4725, -13.237499999999999 8.467500000000001))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '006', '1005', 'Cline Town', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2175 8.477500000000001, -13.2125 8.477500000000001, -13.2125 8.4825, -13.2175 8.4825, -13.2175 8.477500000000001))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '007', '1006', 'Fourah Bay', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2075 8.4755, -13.2025 8.4755, -13.2025 8.4805, -13.2075 8.4805, -13.2075 8.4755))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '008', '1007', 'Foulah Town', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2125 8.4695, -13.207500000000001 8.4695, -13.207500000000001 8.474499999999999, -13.2125 8.474499999999999, -13.2125 8.4695))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '009', '1008', 'Kissy Road', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2005 8.467500000000001, -13.195500000000001 8.467500000000001, -13.195500000000001 8.4725, -13.2005 8.4725, -13.2005 8.467500000000001))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '010', '1009', 'Kissy', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.1875 8.4655, -13.182500000000001 8.4655, -13.182500000000001 8.4705, -13.1875 8.4705, -13.1875 8.4655))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '011', '1010', 'Kissy Dock Yard', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.1775 8.4625, -13.172500000000001 8.4625, -13.172500000000001 8.4675, -13.1775 8.4675, -13.1775 8.4625))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '012', '1011', 'Wellington', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.1625 8.457500000000001, -13.1575 8.457500000000001, -13.1575 8.4625, -13.1625 8.4625, -13.1625 8.457500000000001))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '013', '1012', 'Allen Town', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.1425 8.4525, -13.137500000000001 8.4525, -13.137500000000001 8.4575, -13.1425 8.4575, -13.1425 8.4525))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '014', '1013', 'Hastings', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.122499999999999 8.4475, -13.1175 8.4475, -13.1175 8.452499999999999, -13.122499999999999 8.452499999999999, -13.122499999999999 8.4475))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '015', '1014', 'Brookfields', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.250499999999999 8.4625, -13.2455 8.4625, -13.2455 8.4675, -13.250499999999999 8.4675, -13.250499999999999 8.4625))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '016', '1015', 'Congo Cross', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2575 8.457500000000001, -13.252500000000001 8.457500000000001, -13.252500000000001 8.4625, -13.2575 8.4625, -13.2575 8.457500000000001))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '017', '1016', 'Wilberforce', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2645 8.4525, -13.259500000000001 8.4525, -13.259500000000001 8.4575, -13.2645 8.4575, -13.2645 8.4525))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '018', '1017', 'Signal Hill', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.260499999999999 8.4475, -13.2555 8.4475, -13.2555 8.452499999999999, -13.260499999999999 8.452499999999999, -13.260499999999999 8.4475))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '019', '1018', 'Hill Station', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2525 8.4425, -13.2475 8.4425, -13.2475 8.4475, -13.2525 8.4475, -13.2525 8.4425))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '020', '1019', 'Murray Town', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2705 8.445500000000001, -13.265500000000001 8.445500000000001, -13.265500000000001 8.4505, -13.2705 8.4505, -13.2705 8.445500000000001))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '021', '1020', 'Kingtom', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2625 8.4725, -13.2575 8.4725, -13.2575 8.4775, -13.2625 8.4775, -13.2625 8.4725))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '022', '1021', 'Lumley', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2745 8.4375, -13.2695 8.4375, -13.2695 8.442499999999999, -13.2745 8.442499999999999, -13.2745 8.4375))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '023', '1022', 'Aberdeen', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2805 8.4295, -13.275500000000001 8.4295, -13.275500000000001 8.4345, -13.2805 8.4345, -13.2805 8.4295))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '024', '1023', 'Cockle Bay', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.272499999999999 8.425500000000001, -13.2675 8.425500000000001, -13.2675 8.4305, -13.272499999999999 8.4305, -13.272499999999999 8.425500000000001))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '025', '1024', 'Juba', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2675 8.4175, -13.262500000000001 8.4175, -13.262500000000001 8.4225, -13.2675 8.4225, -13.2675 8.4175))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '026', '1025', 'Regent', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.237499999999999 8.4175, -13.2325 8.4175, -13.2325 8.4225, -13.237499999999999 8.4225, -13.237499999999999 8.4175))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '027', '1026', 'Gloucester', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2225 8.422500000000001, -13.217500000000001 8.422500000000001, -13.217500000000001 8.4275, -13.2225 8.4275, -13.2225 8.422500000000001))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '028', '1027', 'Leicester', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2305 8.4125, -13.2255 8.4125, -13.2255 8.417499999999999, -13.2305 8.417499999999999, -13.2305 8.4125))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '029', '1028', 'Grafton', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2125 8.4075, -13.207500000000001 8.4075, -13.207500000000001 8.4125, -13.2125 8.4125, -13.2125 8.4075))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '030', '1029', 'Charlotte', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.202499999999999 8.4125, -13.1975 8.4125, -13.1975 8.417499999999999, -13.202499999999999 8.417499999999999, -13.202499999999999 8.4125))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '031', '1030', 'Bathurst', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.192499999999999 8.4175, -13.1875 8.4175, -13.1875 8.4225, -13.192499999999999 8.4225, -13.192499999999999 8.4175))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '032', '1031', 'Calaba Town', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2125 8.432500000000001, -13.207500000000001 8.432500000000001, -13.207500000000001 8.4375, -13.2125 8.4375, -13.2125 8.432500000000001))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '033', '1032', 'New England', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.247499999999999 8.4825, -13.2425 8.4825, -13.2425 8.487499999999999, -13.247499999999999 8.487499999999999, -13.247499999999999 8.4825))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '034', '1033', 'Mamba Point', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2225 8.4825, -13.217500000000001 8.4825, -13.217500000000001 8.487499999999999, -13.2225 8.487499999999999, -13.2225 8.4825))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '035', '1034', 'Big Wharf', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2325 8.4855, -13.227500000000001 8.4855, -13.227500000000001 8.490499999999999, -13.2325 8.490499999999999, -13.2325 8.4855))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '036', '1035', 'Government Wharf', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.240499999999999 8.4875, -13.2355 8.4875, -13.2355 8.4925, -13.240499999999999 8.4925, -13.240499999999999 8.4875))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '037', '1036', 'Susan''s Bay', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.250499999999999 8.477500000000001, -13.2455 8.477500000000001, -13.2455 8.4825, -13.250499999999999 8.4825, -13.250499999999999 8.477500000000001))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '038', '1037', 'Ascension Town', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2175 8.4625, -13.2125 8.4625, -13.2125 8.4675, -13.2175 8.4675, -13.2175 8.4625))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '039', '1038', 'Bottom Mango', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.2075 8.457500000000001, -13.2025 8.457500000000001, -13.2025 8.4625, -13.2075 8.4625, -13.2075 8.457500000000001))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '040', '1039', 'Grassfield', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.1975 8.4525, -13.1925 8.4525, -13.1925 8.4575, -13.1975 8.4575, -13.1975 8.4525))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '041', '1040', 'Portee', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.1825 8.4475, -13.1775 8.4475, -13.1775 8.452499999999999, -13.1825 8.452499999999999, -13.1825 8.4475))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '042', '1041', 'Shell', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.1725 8.4425, -13.1675 8.4425, -13.1675 8.4475, -13.1725 8.4475, -13.1725 8.4425))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '043', '1042', 'Waterloo', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.0725 8.3375, -13.0675 8.3375, -13.0675 8.3425, -13.0725 8.3425, -13.0725 8.3375))'), 4326));

-- Verify
SELECT COUNT(*) as total_zones FROM zones;
SELECT primary_code, name, ST_Y(ST_Centroid(geometry)) as lat, ST_X(ST_Centroid(geometry)) as lng FROM zones ORDER BY primary_code;
