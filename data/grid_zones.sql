-- Bounding box: (-13.285, 8.41) to (-13.14, 8.49)
-- Freetown Grid-Based Postal Zones
-- Total zones: 124
-- Grid size: ~0.888km x 0.888km

-- Clear existing zones for Western Area
DELETE FROM zones WHERE district_id IN (1, 2);

-- Reset sequence
SELECT setval('zones_id_seq', 1, false);

-- Insert grid zones
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '001', '1000', 'Zone 1000', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.277000000000001 8.41, -13.269000000000002 8.41, -13.269000000000002 8.418, -13.277000000000001 8.418, -13.277000000000001 8.41))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '002', '1001', 'Zone 1001', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.269000000000002 8.41, -13.261000000000003 8.41, -13.261000000000003 8.418, -13.269000000000002 8.418, -13.269000000000002 8.41))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '003', '1002', 'Zone 1002', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.237000000000005 8.41, -13.229000000000006 8.41, -13.229000000000006 8.418, -13.237000000000005 8.418, -13.237000000000005 8.41))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '004', '1003', 'Zone 1003', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.229000000000006 8.41, -13.221000000000007 8.41, -13.221000000000007 8.418, -13.229000000000006 8.418, -13.229000000000006 8.41))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '005', '1004', 'Zone 1004', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.277000000000001 8.418, -13.269000000000002 8.418, -13.269000000000002 8.425999999999998, -13.277000000000001 8.425999999999998, -13.277000000000001 8.418))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '006', '1005', 'Zone 1005', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.269000000000002 8.418, -13.261000000000003 8.418, -13.261000000000003 8.425999999999998, -13.269000000000002 8.425999999999998, -13.269000000000002 8.418))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '007', '1006', 'Zone 1006', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.261000000000003 8.418, -13.253000000000004 8.418, -13.253000000000004 8.425999999999998, -13.261000000000003 8.425999999999998, -13.261000000000003 8.418))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '008', '1007', 'Zone 1007', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.253000000000004 8.418, -13.245000000000005 8.418, -13.245000000000005 8.425999999999998, -13.253000000000004 8.425999999999998, -13.253000000000004 8.418))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '009', '1008', 'Zone 1008', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.245000000000005 8.418, -13.237000000000005 8.418, -13.237000000000005 8.425999999999998, -13.245000000000005 8.425999999999998, -13.245000000000005 8.418))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '010', '1009', 'Zone 1009', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.237000000000005 8.418, -13.229000000000006 8.418, -13.229000000000006 8.425999999999998, -13.237000000000005 8.425999999999998, -13.237000000000005 8.418))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '011', '1010', 'Zone 1010', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.229000000000006 8.418, -13.221000000000007 8.418, -13.221000000000007 8.425999999999998, -13.229000000000006 8.425999999999998, -13.229000000000006 8.418))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '012', '1011', 'Zone 1011', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.221000000000007 8.418, -13.213000000000008 8.418, -13.213000000000008 8.425999999999998, -13.221000000000007 8.425999999999998, -13.221000000000007 8.418))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '013', '1012', 'Zone 1012', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.213000000000008 8.418, -13.205000000000009 8.418, -13.205000000000009 8.425999999999998, -13.213000000000008 8.425999999999998, -13.213000000000008 8.418))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '014', '1013', 'Zone 1013', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.285 8.425999999999998, -13.277000000000001 8.425999999999998, -13.277000000000001 8.433999999999997, -13.285 8.433999999999997, -13.285 8.425999999999998))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '015', '1014', 'Zone 1014', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.277000000000001 8.425999999999998, -13.269000000000002 8.425999999999998, -13.269000000000002 8.433999999999997, -13.277000000000001 8.433999999999997, -13.277000000000001 8.425999999999998))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '016', '1015', 'Zone 1015', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.269000000000002 8.425999999999998, -13.261000000000003 8.425999999999998, -13.261000000000003 8.433999999999997, -13.269000000000002 8.433999999999997, -13.269000000000002 8.425999999999998))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '017', '1016', 'Zone 1016', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.261000000000003 8.425999999999998, -13.253000000000004 8.425999999999998, -13.253000000000004 8.433999999999997, -13.261000000000003 8.433999999999997, -13.261000000000003 8.425999999999998))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '018', '1017', 'Zone 1017', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.253000000000004 8.425999999999998, -13.245000000000005 8.425999999999998, -13.245000000000005 8.433999999999997, -13.253000000000004 8.433999999999997, -13.253000000000004 8.425999999999998))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '019', '1018', 'Zone 1018', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.245000000000005 8.425999999999998, -13.237000000000005 8.425999999999998, -13.237000000000005 8.433999999999997, -13.245000000000005 8.433999999999997, -13.245000000000005 8.425999999999998))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '020', '1019', 'Zone 1019', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.237000000000005 8.425999999999998, -13.229000000000006 8.425999999999998, -13.229000000000006 8.433999999999997, -13.237000000000005 8.433999999999997, -13.237000000000005 8.425999999999998))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '021', '1020', 'Zone 1020', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.229000000000006 8.425999999999998, -13.221000000000007 8.425999999999998, -13.221000000000007 8.433999999999997, -13.229000000000006 8.433999999999997, -13.229000000000006 8.425999999999998))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '022', '1021', 'Zone 1021', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.221000000000007 8.425999999999998, -13.213000000000008 8.425999999999998, -13.213000000000008 8.433999999999997, -13.221000000000007 8.433999999999997, -13.221000000000007 8.425999999999998))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '023', '1022', 'Zone 1022', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.213000000000008 8.425999999999998, -13.205000000000009 8.425999999999998, -13.205000000000009 8.433999999999997, -13.213000000000008 8.433999999999997, -13.213000000000008 8.425999999999998))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '024', '1023', 'Zone 1023', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.205000000000009 8.425999999999998, -13.19700000000001 8.425999999999998, -13.19700000000001 8.433999999999997, -13.205000000000009 8.433999999999997, -13.205000000000009 8.425999999999998))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '025', '1024', 'Zone 1024', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.19700000000001 8.425999999999998, -13.18900000000001 8.425999999999998, -13.18900000000001 8.433999999999997, -13.19700000000001 8.433999999999997, -13.19700000000001 8.425999999999998))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '026', '1025', 'Zone 1025', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.285 8.433999999999997, -13.277000000000001 8.433999999999997, -13.277000000000001 8.441999999999997, -13.285 8.441999999999997, -13.285 8.433999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '027', '1026', 'Zone 1026', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.277000000000001 8.433999999999997, -13.269000000000002 8.433999999999997, -13.269000000000002 8.441999999999997, -13.277000000000001 8.441999999999997, -13.277000000000001 8.433999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '028', '1027', 'Zone 1027', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.269000000000002 8.433999999999997, -13.261000000000003 8.433999999999997, -13.261000000000003 8.441999999999997, -13.269000000000002 8.441999999999997, -13.269000000000002 8.433999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '029', '1028', 'Zone 1028', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.261000000000003 8.433999999999997, -13.253000000000004 8.433999999999997, -13.253000000000004 8.441999999999997, -13.261000000000003 8.441999999999997, -13.261000000000003 8.433999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '030', '1029', 'Zone 1029', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.253000000000004 8.433999999999997, -13.245000000000005 8.433999999999997, -13.245000000000005 8.441999999999997, -13.253000000000004 8.441999999999997, -13.253000000000004 8.433999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '031', '1030', 'Zone 1030', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.245000000000005 8.433999999999997, -13.237000000000005 8.433999999999997, -13.237000000000005 8.441999999999997, -13.245000000000005 8.441999999999997, -13.245000000000005 8.433999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '032', '1031', 'Zone 1031', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.237000000000005 8.433999999999997, -13.229000000000006 8.433999999999997, -13.229000000000006 8.441999999999997, -13.237000000000005 8.441999999999997, -13.237000000000005 8.433999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '033', '1032', 'Zone 1032', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.229000000000006 8.433999999999997, -13.221000000000007 8.433999999999997, -13.221000000000007 8.441999999999997, -13.229000000000006 8.441999999999997, -13.229000000000006 8.433999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '034', '1033', 'Zone 1033', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.221000000000007 8.433999999999997, -13.213000000000008 8.433999999999997, -13.213000000000008 8.441999999999997, -13.221000000000007 8.441999999999997, -13.221000000000007 8.433999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '035', '1034', 'Zone 1034', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.213000000000008 8.433999999999997, -13.205000000000009 8.433999999999997, -13.205000000000009 8.441999999999997, -13.213000000000008 8.441999999999997, -13.213000000000008 8.433999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '036', '1035', 'Zone 1035', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.205000000000009 8.433999999999997, -13.19700000000001 8.433999999999997, -13.19700000000001 8.441999999999997, -13.205000000000009 8.441999999999997, -13.205000000000009 8.433999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '037', '1036', 'Zone 1036', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.19700000000001 8.433999999999997, -13.18900000000001 8.433999999999997, -13.18900000000001 8.441999999999997, -13.19700000000001 8.441999999999997, -13.19700000000001 8.433999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '038', '1037', 'Zone 1037', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.18900000000001 8.433999999999997, -13.181000000000012 8.433999999999997, -13.181000000000012 8.441999999999997, -13.18900000000001 8.441999999999997, -13.18900000000001 8.433999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '039', '1038', 'Zone 1038', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.181000000000012 8.433999999999997, -13.173000000000012 8.433999999999997, -13.173000000000012 8.441999999999997, -13.181000000000012 8.441999999999997, -13.181000000000012 8.433999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '040', '1039', 'Zone 1039', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.285 8.441999999999997, -13.277000000000001 8.441999999999997, -13.277000000000001 8.449999999999996, -13.285 8.449999999999996, -13.285 8.441999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '041', '1040', 'Zone 1040', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.277000000000001 8.441999999999997, -13.269000000000002 8.441999999999997, -13.269000000000002 8.449999999999996, -13.277000000000001 8.449999999999996, -13.277000000000001 8.441999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '042', '1041', 'Zone 1041', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.269000000000002 8.441999999999997, -13.261000000000003 8.441999999999997, -13.261000000000003 8.449999999999996, -13.269000000000002 8.449999999999996, -13.269000000000002 8.441999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '043', '1042', 'Zone 1042', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.261000000000003 8.441999999999997, -13.253000000000004 8.441999999999997, -13.253000000000004 8.449999999999996, -13.261000000000003 8.449999999999996, -13.261000000000003 8.441999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '044', '1043', 'Zone 1043', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.253000000000004 8.441999999999997, -13.245000000000005 8.441999999999997, -13.245000000000005 8.449999999999996, -13.253000000000004 8.449999999999996, -13.253000000000004 8.441999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '045', '1044', 'Zone 1044', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.245000000000005 8.441999999999997, -13.237000000000005 8.441999999999997, -13.237000000000005 8.449999999999996, -13.245000000000005 8.449999999999996, -13.245000000000005 8.441999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '046', '1045', 'Zone 1045', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.237000000000005 8.441999999999997, -13.229000000000006 8.441999999999997, -13.229000000000006 8.449999999999996, -13.237000000000005 8.449999999999996, -13.237000000000005 8.441999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '047', '1046', 'Zone 1046', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.229000000000006 8.441999999999997, -13.221000000000007 8.441999999999997, -13.221000000000007 8.449999999999996, -13.229000000000006 8.449999999999996, -13.229000000000006 8.441999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '048', '1047', 'Zone 1047', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.221000000000007 8.441999999999997, -13.213000000000008 8.441999999999997, -13.213000000000008 8.449999999999996, -13.221000000000007 8.449999999999996, -13.221000000000007 8.441999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '049', '1048', 'Zone 1048', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.213000000000008 8.441999999999997, -13.205000000000009 8.441999999999997, -13.205000000000009 8.449999999999996, -13.213000000000008 8.449999999999996, -13.213000000000008 8.441999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '050', '1049', 'Zone 1049', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.205000000000009 8.441999999999997, -13.19700000000001 8.441999999999997, -13.19700000000001 8.449999999999996, -13.205000000000009 8.449999999999996, -13.205000000000009 8.441999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '051', '1050', 'Zone 1050', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.19700000000001 8.441999999999997, -13.18900000000001 8.441999999999997, -13.18900000000001 8.449999999999996, -13.19700000000001 8.449999999999996, -13.19700000000001 8.441999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '052', '1051', 'Zone 1051', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.18900000000001 8.441999999999997, -13.181000000000012 8.441999999999997, -13.181000000000012 8.449999999999996, -13.18900000000001 8.449999999999996, -13.18900000000001 8.441999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '053', '1052', 'Zone 1052', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.181000000000012 8.441999999999997, -13.173000000000012 8.441999999999997, -13.173000000000012 8.449999999999996, -13.181000000000012 8.449999999999996, -13.181000000000012 8.441999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '054', '1053', 'Zone 1053', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.173000000000012 8.441999999999997, -13.165000000000013 8.441999999999997, -13.165000000000013 8.449999999999996, -13.173000000000012 8.449999999999996, -13.173000000000012 8.441999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '055', '1054', 'Zone 1054', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.165000000000013 8.441999999999997, -13.157000000000014 8.441999999999997, -13.157000000000014 8.449999999999996, -13.165000000000013 8.449999999999996, -13.165000000000013 8.441999999999997))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '056', '1055', 'Zone 1055', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.285 8.449999999999996, -13.277000000000001 8.449999999999996, -13.277000000000001 8.457999999999995, -13.285 8.457999999999995, -13.285 8.449999999999996))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '057', '1056', 'Zone 1056', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.277000000000001 8.449999999999996, -13.269000000000002 8.449999999999996, -13.269000000000002 8.457999999999995, -13.277000000000001 8.457999999999995, -13.277000000000001 8.449999999999996))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '058', '1057', 'Zone 1057', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.269000000000002 8.449999999999996, -13.261000000000003 8.449999999999996, -13.261000000000003 8.457999999999995, -13.269000000000002 8.457999999999995, -13.269000000000002 8.449999999999996))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '059', '1058', 'Zone 1058', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.261000000000003 8.449999999999996, -13.253000000000004 8.449999999999996, -13.253000000000004 8.457999999999995, -13.261000000000003 8.457999999999995, -13.261000000000003 8.449999999999996))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '060', '1059', 'Zone 1059', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.253000000000004 8.449999999999996, -13.245000000000005 8.449999999999996, -13.245000000000005 8.457999999999995, -13.253000000000004 8.457999999999995, -13.253000000000004 8.449999999999996))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '061', '1060', 'Zone 1060', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.245000000000005 8.449999999999996, -13.237000000000005 8.449999999999996, -13.237000000000005 8.457999999999995, -13.245000000000005 8.457999999999995, -13.245000000000005 8.449999999999996))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '062', '1061', 'Zone 1061', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.237000000000005 8.449999999999996, -13.229000000000006 8.449999999999996, -13.229000000000006 8.457999999999995, -13.237000000000005 8.457999999999995, -13.237000000000005 8.449999999999996))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '063', '1062', 'Zone 1062', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.229000000000006 8.449999999999996, -13.221000000000007 8.449999999999996, -13.221000000000007 8.457999999999995, -13.229000000000006 8.457999999999995, -13.229000000000006 8.449999999999996))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '064', '1063', 'Zone 1063', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.221000000000007 8.449999999999996, -13.213000000000008 8.449999999999996, -13.213000000000008 8.457999999999995, -13.221000000000007 8.457999999999995, -13.221000000000007 8.449999999999996))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '065', '1064', 'Zone 1064', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.213000000000008 8.449999999999996, -13.205000000000009 8.449999999999996, -13.205000000000009 8.457999999999995, -13.213000000000008 8.457999999999995, -13.213000000000008 8.449999999999996))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '066', '1065', 'Zone 1065', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.205000000000009 8.449999999999996, -13.19700000000001 8.449999999999996, -13.19700000000001 8.457999999999995, -13.205000000000009 8.457999999999995, -13.205000000000009 8.449999999999996))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '067', '1066', 'Zone 1066', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.19700000000001 8.449999999999996, -13.18900000000001 8.449999999999996, -13.18900000000001 8.457999999999995, -13.19700000000001 8.457999999999995, -13.19700000000001 8.449999999999996))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '068', '1067', 'Zone 1067', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.18900000000001 8.449999999999996, -13.181000000000012 8.449999999999996, -13.181000000000012 8.457999999999995, -13.18900000000001 8.457999999999995, -13.18900000000001 8.449999999999996))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '069', '1068', 'Zone 1068', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.181000000000012 8.449999999999996, -13.173000000000012 8.449999999999996, -13.173000000000012 8.457999999999995, -13.181000000000012 8.457999999999995, -13.181000000000012 8.449999999999996))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '070', '1069', 'Zone 1069', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.173000000000012 8.449999999999996, -13.165000000000013 8.449999999999996, -13.165000000000013 8.457999999999995, -13.173000000000012 8.457999999999995, -13.173000000000012 8.449999999999996))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '071', '1070', 'Zone 1070', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.165000000000013 8.449999999999996, -13.157000000000014 8.449999999999996, -13.157000000000014 8.457999999999995, -13.165000000000013 8.457999999999995, -13.165000000000013 8.449999999999996))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '072', '1071', 'Zone 1071', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.157000000000014 8.449999999999996, -13.149000000000015 8.449999999999996, -13.149000000000015 8.457999999999995, -13.157000000000014 8.457999999999995, -13.157000000000014 8.449999999999996))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '073', '1072', 'Zone 1072', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.277000000000001 8.457999999999995, -13.269000000000002 8.457999999999995, -13.269000000000002 8.465999999999994, -13.277000000000001 8.465999999999994, -13.277000000000001 8.457999999999995))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '074', '1073', 'Zone 1073', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.269000000000002 8.457999999999995, -13.261000000000003 8.457999999999995, -13.261000000000003 8.465999999999994, -13.269000000000002 8.465999999999994, -13.269000000000002 8.457999999999995))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '075', '1074', 'Zone 1074', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.261000000000003 8.457999999999995, -13.253000000000004 8.457999999999995, -13.253000000000004 8.465999999999994, -13.261000000000003 8.465999999999994, -13.261000000000003 8.457999999999995))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '076', '1075', 'Zone 1075', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.253000000000004 8.457999999999995, -13.245000000000005 8.457999999999995, -13.245000000000005 8.465999999999994, -13.253000000000004 8.465999999999994, -13.253000000000004 8.457999999999995))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '077', '1076', 'Zone 1076', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.245000000000005 8.457999999999995, -13.237000000000005 8.457999999999995, -13.237000000000005 8.465999999999994, -13.245000000000005 8.465999999999994, -13.245000000000005 8.457999999999995))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '078', '1077', 'Zone 1077', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.237000000000005 8.457999999999995, -13.229000000000006 8.457999999999995, -13.229000000000006 8.465999999999994, -13.237000000000005 8.465999999999994, -13.237000000000005 8.457999999999995))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '079', '1078', 'Zone 1078', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.229000000000006 8.457999999999995, -13.221000000000007 8.457999999999995, -13.221000000000007 8.465999999999994, -13.229000000000006 8.465999999999994, -13.229000000000006 8.457999999999995))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '080', '1079', 'Zone 1079', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.221000000000007 8.457999999999995, -13.213000000000008 8.457999999999995, -13.213000000000008 8.465999999999994, -13.221000000000007 8.465999999999994, -13.221000000000007 8.457999999999995))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '081', '1080', 'Zone 1080', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.213000000000008 8.457999999999995, -13.205000000000009 8.457999999999995, -13.205000000000009 8.465999999999994, -13.213000000000008 8.465999999999994, -13.213000000000008 8.457999999999995))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '082', '1081', 'Zone 1081', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.205000000000009 8.457999999999995, -13.19700000000001 8.457999999999995, -13.19700000000001 8.465999999999994, -13.205000000000009 8.465999999999994, -13.205000000000009 8.457999999999995))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '083', '1082', 'Zone 1082', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.19700000000001 8.457999999999995, -13.18900000000001 8.457999999999995, -13.18900000000001 8.465999999999994, -13.19700000000001 8.465999999999994, -13.19700000000001 8.457999999999995))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '084', '1083', 'Zone 1083', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.18900000000001 8.457999999999995, -13.181000000000012 8.457999999999995, -13.181000000000012 8.465999999999994, -13.18900000000001 8.465999999999994, -13.18900000000001 8.457999999999995))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '085', '1084', 'Zone 1084', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.181000000000012 8.457999999999995, -13.173000000000012 8.457999999999995, -13.173000000000012 8.465999999999994, -13.181000000000012 8.465999999999994, -13.181000000000012 8.457999999999995))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '086', '1085', 'Zone 1085', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.173000000000012 8.457999999999995, -13.165000000000013 8.457999999999995, -13.165000000000013 8.465999999999994, -13.173000000000012 8.465999999999994, -13.173000000000012 8.457999999999995))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '087', '1086', 'Zone 1086', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.165000000000013 8.457999999999995, -13.157000000000014 8.457999999999995, -13.157000000000014 8.465999999999994, -13.165000000000013 8.465999999999994, -13.165000000000013 8.457999999999995))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '088', '1087', 'Zone 1087', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.157000000000014 8.457999999999995, -13.149000000000015 8.457999999999995, -13.149000000000015 8.465999999999994, -13.157000000000014 8.465999999999994, -13.157000000000014 8.457999999999995))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '089', '1088', 'Zone 1088', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.149000000000015 8.457999999999995, -13.141000000000016 8.457999999999995, -13.141000000000016 8.465999999999994, -13.149000000000015 8.465999999999994, -13.149000000000015 8.457999999999995))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '090', '1089', 'Zone 1089', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.277000000000001 8.465999999999994, -13.269000000000002 8.465999999999994, -13.269000000000002 8.473999999999993, -13.277000000000001 8.473999999999993, -13.277000000000001 8.465999999999994))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '091', '1090', 'Zone 1090', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.269000000000002 8.465999999999994, -13.261000000000003 8.465999999999994, -13.261000000000003 8.473999999999993, -13.269000000000002 8.473999999999993, -13.269000000000002 8.465999999999994))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '092', '1091', 'Zone 1091', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.261000000000003 8.465999999999994, -13.253000000000004 8.465999999999994, -13.253000000000004 8.473999999999993, -13.261000000000003 8.473999999999993, -13.261000000000003 8.465999999999994))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '093', '1092', 'Zone 1092', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.253000000000004 8.465999999999994, -13.245000000000005 8.465999999999994, -13.245000000000005 8.473999999999993, -13.253000000000004 8.473999999999993, -13.253000000000004 8.465999999999994))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '094', '1093', 'Zone 1093', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.245000000000005 8.465999999999994, -13.237000000000005 8.465999999999994, -13.237000000000005 8.473999999999993, -13.245000000000005 8.473999999999993, -13.245000000000005 8.465999999999994))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '095', '1094', 'Zone 1094', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.237000000000005 8.465999999999994, -13.229000000000006 8.465999999999994, -13.229000000000006 8.473999999999993, -13.237000000000005 8.473999999999993, -13.237000000000005 8.465999999999994))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '096', '1095', 'Zone 1095', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.229000000000006 8.465999999999994, -13.221000000000007 8.465999999999994, -13.221000000000007 8.473999999999993, -13.229000000000006 8.473999999999993, -13.229000000000006 8.465999999999994))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '097', '1096', 'Zone 1096', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.221000000000007 8.465999999999994, -13.213000000000008 8.465999999999994, -13.213000000000008 8.473999999999993, -13.221000000000007 8.473999999999993, -13.221000000000007 8.465999999999994))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '098', '1097', 'Zone 1097', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.213000000000008 8.465999999999994, -13.205000000000009 8.465999999999994, -13.205000000000009 8.473999999999993, -13.213000000000008 8.473999999999993, -13.213000000000008 8.465999999999994))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '099', '1098', 'Zone 1098', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.205000000000009 8.465999999999994, -13.19700000000001 8.465999999999994, -13.19700000000001 8.473999999999993, -13.205000000000009 8.473999999999993, -13.205000000000009 8.465999999999994))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (2, '100', '1099', 'Zone 1099', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.19700000000001 8.465999999999994, -13.18900000000001 8.465999999999994, -13.18900000000001 8.473999999999993, -13.19700000000001 8.473999999999993, -13.19700000000001 8.465999999999994))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '101', '1100', 'Zone 1100', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.18900000000001 8.465999999999994, -13.181000000000012 8.465999999999994, -13.181000000000012 8.473999999999993, -13.18900000000001 8.473999999999993, -13.18900000000001 8.465999999999994))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '102', '1101', 'Zone 1101', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.181000000000012 8.465999999999994, -13.173000000000012 8.465999999999994, -13.173000000000012 8.473999999999993, -13.181000000000012 8.473999999999993, -13.181000000000012 8.465999999999994))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '103', '1102', 'Zone 1102', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.173000000000012 8.465999999999994, -13.165000000000013 8.465999999999994, -13.165000000000013 8.473999999999993, -13.173000000000012 8.473999999999993, -13.173000000000012 8.465999999999994))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '104', '1103', 'Zone 1103', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.165000000000013 8.465999999999994, -13.157000000000014 8.465999999999994, -13.157000000000014 8.473999999999993, -13.165000000000013 8.473999999999993, -13.165000000000013 8.465999999999994))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '105', '1104', 'Zone 1104', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.157000000000014 8.465999999999994, -13.149000000000015 8.465999999999994, -13.149000000000015 8.473999999999993, -13.157000000000014 8.473999999999993, -13.157000000000014 8.465999999999994))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '106', '1105', 'Zone 1105', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.269000000000002 8.473999999999993, -13.261000000000003 8.473999999999993, -13.261000000000003 8.481999999999992, -13.269000000000002 8.481999999999992, -13.269000000000002 8.473999999999993))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '107', '1106', 'Zone 1106', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.261000000000003 8.473999999999993, -13.253000000000004 8.473999999999993, -13.253000000000004 8.481999999999992, -13.261000000000003 8.481999999999992, -13.261000000000003 8.473999999999993))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '108', '1107', 'Zone 1107', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.253000000000004 8.473999999999993, -13.245000000000005 8.473999999999993, -13.245000000000005 8.481999999999992, -13.253000000000004 8.481999999999992, -13.253000000000004 8.473999999999993))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '109', '1108', 'Zone 1108', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.245000000000005 8.473999999999993, -13.237000000000005 8.473999999999993, -13.237000000000005 8.481999999999992, -13.245000000000005 8.481999999999992, -13.245000000000005 8.473999999999993))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '110', '1109', 'Zone 1109', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.237000000000005 8.473999999999993, -13.229000000000006 8.473999999999993, -13.229000000000006 8.481999999999992, -13.237000000000005 8.481999999999992, -13.237000000000005 8.473999999999993))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '111', '1110', 'Zone 1110', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.229000000000006 8.473999999999993, -13.221000000000007 8.473999999999993, -13.221000000000007 8.481999999999992, -13.229000000000006 8.481999999999992, -13.229000000000006 8.473999999999993))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '112', '1111', 'Zone 1111', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.221000000000007 8.473999999999993, -13.213000000000008 8.473999999999993, -13.213000000000008 8.481999999999992, -13.221000000000007 8.481999999999992, -13.221000000000007 8.473999999999993))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '113', '1112', 'Zone 1112', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.213000000000008 8.473999999999993, -13.205000000000009 8.473999999999993, -13.205000000000009 8.481999999999992, -13.213000000000008 8.481999999999992, -13.213000000000008 8.473999999999993))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '114', '1113', 'Zone 1113', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.205000000000009 8.473999999999993, -13.19700000000001 8.473999999999993, -13.19700000000001 8.481999999999992, -13.205000000000009 8.481999999999992, -13.205000000000009 8.473999999999993))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '115', '1114', 'Zone 1114', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.19700000000001 8.473999999999993, -13.18900000000001 8.473999999999993, -13.18900000000001 8.481999999999992, -13.19700000000001 8.481999999999992, -13.19700000000001 8.473999999999993))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '116', '1115', 'Zone 1115', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.18900000000001 8.473999999999993, -13.181000000000012 8.473999999999993, -13.181000000000012 8.481999999999992, -13.18900000000001 8.481999999999992, -13.18900000000001 8.473999999999993))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '117', '1116', 'Zone 1116', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.181000000000012 8.473999999999993, -13.173000000000012 8.473999999999993, -13.173000000000012 8.481999999999992, -13.181000000000012 8.481999999999992, -13.181000000000012 8.473999999999993))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '118', '1117', 'Zone 1117', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.173000000000012 8.473999999999993, -13.165000000000013 8.473999999999993, -13.165000000000013 8.481999999999992, -13.173000000000012 8.481999999999992, -13.173000000000012 8.473999999999993))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '119', '1118', 'Zone 1118', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.245000000000005 8.481999999999992, -13.237000000000005 8.481999999999992, -13.237000000000005 8.489999999999991, -13.245000000000005 8.489999999999991, -13.245000000000005 8.481999999999992))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '120', '1119', 'Zone 1119', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.237000000000005 8.481999999999992, -13.229000000000006 8.481999999999992, -13.229000000000006 8.489999999999991, -13.237000000000005 8.489999999999991, -13.237000000000005 8.481999999999992))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '121', '1120', 'Zone 1120', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.229000000000006 8.481999999999992, -13.221000000000007 8.481999999999992, -13.221000000000007 8.489999999999991, -13.229000000000006 8.489999999999991, -13.229000000000006 8.481999999999992))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '122', '1121', 'Zone 1121', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.221000000000007 8.481999999999992, -13.213000000000008 8.481999999999992, -13.213000000000008 8.489999999999991, -13.221000000000007 8.489999999999991, -13.221000000000007 8.481999999999992))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '123', '1122', 'Zone 1122', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.213000000000008 8.481999999999992, -13.205000000000009 8.481999999999992, -13.205000000000009 8.489999999999991, -13.213000000000008 8.489999999999991, -13.213000000000008 8.481999999999992))'), 4326));
INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES (1, '124', '1123', 'Zone 1123', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('POLYGON((-13.205000000000009 8.481999999999992, -13.19700000000001 8.481999999999992, -13.19700000000001 8.489999999999991, -13.205000000000009 8.489999999999991, -13.205000000000009 8.481999999999992))'), 4326));

-- Verify
SELECT COUNT(*) as total_zones FROM zones;
