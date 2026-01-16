-- Add postal_zones for all districts
-- Format: zone_code (XXXX-XXX), primary_code (XXXX), segment (XXX)

-- Western Area Rural (10)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type) VALUES
('1001-001', '1001', '001', 1, 'Western Area', 0, 'Western Area Rural', 'Waterloo Central', 'commercial'),
('1001-002', '1001', '002', 1, 'Western Area', 0, 'Western Area Rural', 'Waterloo Station', 'mixed'),
('1002-001', '1002', '001', 1, 'Western Area', 0, 'Western Area Rural', 'Tombo Village', 'residential'),
('1003-001', '1003', '001', 1, 'Western Area', 0, 'Western Area Rural', 'York Main', 'residential'),
('1004-001', '1004', '001', 1, 'Western Area', 0, 'Western Area Rural', 'Kent Beach', 'residential'),
('1005-001', '1005', '001', 1, 'Western Area', 0, 'Western Area Rural', 'Regent Central', 'residential'),
('1006-001', '1006', '001', 1, 'Western Area', 0, 'Western Area Rural', 'Gloucester Village', 'residential'),
('1007-001', '1007', '001', 1, 'Western Area', 0, 'Western Area Rural', 'Leicester Peak', 'residential'),
('1008-001', '1008', '001', 1, 'Western Area', 0, 'Western Area Rural', 'Newton Town', 'mixed'),
('1009-001', '1009', '001', 1, 'Western Area', 0, 'Western Area Rural', 'Benguema Barracks', 'government');

-- Bombali District (21)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type) VALUES
('2101-001', '2101', '001', 2, 'Northern Province', 1, 'Bombali', 'Makeni CBD', 'commercial'),
('2101-002', '2101', '002', 2, 'Northern Province', 1, 'Bombali', 'Makeni Market', 'commercial'),
('2101-003', '2101', '003', 2, 'Northern Province', 1, 'Bombali', 'Azzolini Highway', 'mixed'),
('2102-001', '2102', '001', 2, 'Northern Province', 1, 'Bombali', 'Teko', 'residential'),
('2102-002', '2102', '002', 2, 'Northern Province', 1, 'Bombali', 'Teko Extension', 'residential'),
('2103-001', '2103', '001', 2, 'Northern Province', 1, 'Bombali', 'Rogbaneh Road', 'residential'),
('2104-001', '2104', '001', 2, 'Northern Province', 1, 'Bombali', 'Mabanta', 'residential'),
('2105-001', '2105', '001', 2, 'Northern Province', 1, 'Bombali', 'Renner Town', 'residential'),
('2106-001', '2106', '001', 2, 'Northern Province', 1, 'Bombali', 'Masuba', 'residential'),
('2107-001', '2107', '001', 2, 'Northern Province', 1, 'Bombali', 'OIC Junction', 'mixed');

-- Koinadugu District (23) - Kabala
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type) VALUES
('2301-001', '2301', '001', 2, 'Northern Province', 3, 'Koinadugu', 'Kabala Town Center', 'commercial'),
('2301-002', '2301', '002', 2, 'Northern Province', 3, 'Koinadugu', 'Kabala Market', 'commercial'),
('2302-001', '2302', '001', 2, 'Northern Province', 3, 'Koinadugu', 'Yogomaia', 'residential'),
('2303-001', '2303', '001', 2, 'Northern Province', 3, 'Koinadugu', 'Gbawuria', 'residential'),
('2304-001', '2304', '001', 2, 'Northern Province', 3, 'Koinadugu', 'Kakelleh', 'mixed');

-- Tonkolili District (24) - Magburaka
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type) VALUES
('2401-001', '2401', '001', 2, 'Northern Province', 4, 'Tonkolili', 'Magburaka Center', 'commercial'),
('2401-002', '2401', '002', 2, 'Northern Province', 4, 'Tonkolili', 'Magburaka Junction', 'mixed'),
('2402-001', '2402', '001', 2, 'Northern Province', 4, 'Tonkolili', 'Mabai', 'residential'),
('2403-001', '2403', '001', 2, 'Northern Province', 4, 'Tonkolili', 'Fonima', 'residential'),
('2405-001', '2405', '001', 2, 'Northern Province', 4, 'Tonkolili', 'Bumbuna Town', 'mixed'),
('2407-001', '2407', '001', 2, 'Northern Province', 4, 'Tonkolili', 'Mile 91 Junction', 'commercial');

-- Port Loko District (32)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type) VALUES
('3201-001', '3201', '001', 3, 'North West Province', 2, 'Port Loko', 'Port Loko Town', 'commercial'),
('3201-002', '3201', '002', 3, 'North West Province', 2, 'Port Loko', 'Bai Bureh Road', 'mixed'),
('3202-001', '3202', '001', 3, 'North West Province', 2, 'Port Loko', 'Mange Bureh', 'residential'),
('3204-001', '3204', '001', 3, 'North West Province', 2, 'Port Loko', 'Lunsar Town', 'commercial'),
('3204-002', '3204', '002', 3, 'North West Province', 2, 'Port Loko', 'Lunsar Market', 'commercial'),
('3207-001', '3207', '001', 3, 'North West Province', 2, 'Port Loko', 'Lungi Town', 'mixed'),
('3208-001', '3208', '001', 3, 'North West Province', 2, 'Port Loko', 'Lungi Airport', 'commercial'),
('3211-001', '3211', '001', 3, 'North West Province', 2, 'Port Loko', 'Masiaka Junction', 'commercial');

-- Bo District (41)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type) VALUES
('4101-001', '4101', '001', 4, 'Southern Province', 1, 'Bo', 'Bo CBD', 'commercial'),
('4101-002', '4101', '002', 4, 'Southern Province', 1, 'Bo', 'Bo Main Market', 'commercial'),
('4101-003', '4101', '003', 4, 'Southern Province', 1, 'Bo', 'Damballa Road', 'mixed'),
('4102-001', '4102', '001', 4, 'Southern Province', 1, 'Bo', 'Kissi Town', 'residential'),
('4102-002', '4102', '002', 4, 'Southern Province', 1, 'Bo', 'Kissi Mess Mess', 'residential'),
('4103-001', '4103', '001', 4, 'Southern Province', 1, 'Bo', 'Njai Town', 'residential'),
('4104-001', '4104', '001', 4, 'Southern Province', 1, 'Bo', 'New Site', 'mixed'),
('4105-001', '4105', '001', 4, 'Southern Province', 1, 'Bo', 'Kulanda Town', 'residential'),
('4106-001', '4106', '001', 4, 'Southern Province', 1, 'Bo', 'Nduvuibu', 'residential'),
('4107-001', '4107', '001', 4, 'Southern Province', 1, 'Bo', 'Bo Government Area', 'government');

-- Kenema District (52)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type) VALUES
('5201-001', '5201', '001', 5, 'Eastern Province', 2, 'Kenema', 'Kenema CBD', 'commercial'),
('5201-002', '5201', '002', 5, 'Eastern Province', 2, 'Kenema', 'Kenema Main Market', 'commercial'),
('5201-003', '5201', '003', 5, 'Eastern Province', 2, 'Kenema', 'Hangha Road', 'mixed'),
('5202-001', '5202', '001', 5, 'Eastern Province', 2, 'Kenema', 'Nyandeyama', 'residential'),
('5202-002', '5202', '002', 5, 'Eastern Province', 2, 'Kenema', 'Nyandeyama Extension', 'residential'),
('5203-001', '5203', '001', 5, 'Eastern Province', 2, 'Kenema', 'Combema Road', 'residential'),
('5204-001', '5204', '001', 5, 'Eastern Province', 2, 'Kenema', 'Kenema Government', 'government'),
('5205-001', '5205', '001', 5, 'Eastern Province', 2, 'Kenema', 'Blama Road', 'residential');

-- Kono District (53) - Koidu
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type) VALUES
('5301-001', '5301', '001', 5, 'Eastern Province', 3, 'Kono', 'Koidu Town Center', 'commercial'),
('5301-002', '5301', '002', 5, 'Eastern Province', 3, 'Kono', 'Koidu Main Market', 'commercial'),
('5301-003', '5301', '003', 5, 'Eastern Province', 3, 'Kono', 'Lebanese Quarter', 'commercial'),
('5302-001', '5302', '001', 5, 'Eastern Province', 3, 'Kono', 'New Sembehun', 'residential'),
('5302-002', '5302', '002', 5, 'Eastern Province', 3, 'Kono', 'Sembehun Extension', 'residential'),
('5303-001', '5303', '001', 5, 'Eastern Province', 3, 'Kono', 'Tankoro', 'residential'),
('5304-001', '5304', '001', 5, 'Eastern Province', 3, 'Kono', 'Gbense', 'mixed'),
('5305-001', '5305', '001', 5, 'Eastern Province', 3, 'Kono', 'Yengema', 'mixed');

-- Kailahun District (51)
INSERT INTO postal_zones (zone_code, primary_code, segment, region_code, region_name, district_code, district_name, zone_name, segment_type) VALUES
('5101-001', '5101', '001', 5, 'Eastern Province', 1, 'Kailahun', 'Kailahun Town', 'commercial'),
('5101-002', '5101', '002', 5, 'Eastern Province', 1, 'Kailahun', 'Kailahun Market', 'commercial'),
('5102-001', '5102', '001', 5, 'Eastern Province', 1, 'Kailahun', 'Kailahun Central', 'residential'),
('5103-001', '5103', '001', 5, 'Eastern Province', 1, 'Kailahun', 'Segbwema Town', 'commercial'),
('5103-002', '5103', '002', 5, 'Eastern Province', 1, 'Kailahun', 'Segbwema Market', 'commercial'),
('5105-001', '5105', '001', 5, 'Eastern Province', 1, 'Kailahun', 'Pendembu', 'mixed');
