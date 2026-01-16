-- Sample addresses for Sierra Leone Postal System
-- PDA-ID format: SL-XXXX-XXX-YYYYYY-C (where C is check digit)

-- Freetown CBD addresses (1100-001, 1100-002, 1100-003)
INSERT INTO addresses (pda_id, zone_code, location, latitude, longitude, street_name, house_number, building_name, landmark_primary, address_type, verification_status, confidence_score)
VALUES
('SL-1100-001-000001-1', '1100-001', ST_SetSRID(ST_MakePoint(-13.2343, 8.4841), 4326), 8.4841, -13.2343, 'Siaka Stevens Street', '1', 'State House', 'Near Cotton Tree', 'government', 'verified', 0.95),
('SL-1100-001-000002-2', '1100-001', ST_SetSRID(ST_MakePoint(-13.2350, 8.4835), 4326), 8.4835, -13.2350, 'Siaka Stevens Street', '15', 'Bank of Sierra Leone', 'Opposite State House', 'commercial', 'verified', 0.92),
('SL-1100-001-000003-3', '1100-001', ST_SetSRID(ST_MakePoint(-13.2355, 8.4830), 4326), 8.4830, -13.2355, 'Gloucester Street', '22', 'City Hall', 'Near Central Police Station', 'government', 'verified', 0.90),
('SL-1100-001-000004-4', '1100-001', ST_SetSRID(ST_MakePoint(-13.2360, 8.4825), 4326), 8.4825, -13.2360, 'Howe Street', '5', 'Freetown City Council', 'Behind Law Courts', 'government', 'verified', 0.88),
('SL-1100-002-000001-5', '1100-002', ST_SetSRID(ST_MakePoint(-13.2298, 8.4856), 4326), 8.4856, -13.2298, 'Tower Hill Road', '10', 'Sierra Leone Broadcasting', 'SLBS Building', 'commercial', 'verified', 0.91),
('SL-1100-002-000002-6', '1100-002', ST_SetSRID(ST_MakePoint(-13.2290, 8.4860), 4326), 8.4860, -13.2290, 'Pademba Road', '45', 'Central Prison', 'Main Entrance', 'government', 'verified', 0.89),
('SL-1100-003-000001-7', '1100-003', ST_SetSRID(ST_MakePoint(-13.2340, 8.4850), 4326), 8.4850, -13.2340, 'Rawdon Street', '8', 'National Museum', 'Near Cotton Tree', 'commercial', 'verified', 0.93),
('SL-1100-003-000002-8', '1100-003', ST_SetSRID(ST_MakePoint(-13.2345, 8.4845), 4326), 8.4845, -13.2345, 'Lightfoot Boston Street', '12', 'Supreme Court', 'Law Courts Building', 'government', 'verified', 0.94);

-- Cline Town / East End (1101)
INSERT INTO addresses (pda_id, zone_code, location, latitude, longitude, street_name, house_number, building_name, landmark_primary, address_type, verification_status, confidence_score)
VALUES
('SL-1101-001-000001-9', '1101-001', ST_SetSRID(ST_MakePoint(-13.2150, 8.4720), 4326), 8.4720, -13.2150, 'Cline Street', '23', NULL, 'Near Cline Town Market', 'residential', 'verified', 0.85),
('SL-1101-001-000002-0', '1101-001', ST_SetSRID(ST_MakePoint(-13.2155, 8.4725), 4326), 8.4725, -13.2155, 'Cline Street', '45', 'Cline Town Primary School', 'School Junction', 'commercial', 'verified', 0.87),
('SL-1101-002-000001-1', '1101-002', ST_SetSRID(ST_MakePoint(-13.2100, 8.4700), 4326), 8.4700, -13.2100, 'East End Road', '12', NULL, 'Behind Connaught Hospital', 'residential', 'verified', 0.82),
('SL-1101-002-000002-2', '1101-002', ST_SetSRID(ST_MakePoint(-13.2105, 8.4695), 4326), 8.4695, -13.2105, 'Susan Bay Road', '7', NULL, 'Near Fishing Community', 'residential', 'pending', 0.75),
('SL-1101-003-000001-3', '1101-003', ST_SetSRID(ST_MakePoint(-13.2080, 8.4680), 4326), 8.4680, -13.2080, 'Fourah Bay Road', '18', 'Fourah Bay College Annex', 'Near University', 'commercial', 'verified', 0.88);

-- Congo Town / Foulah Town (1102)
INSERT INTO addresses (pda_id, zone_code, location, latitude, longitude, street_name, house_number, building_name, landmark_primary, address_type, verification_status, confidence_score)
VALUES
('SL-1102-001-000001-4', '1102-001', ST_SetSRID(ST_MakePoint(-13.2400, 8.4750), 4326), 8.4750, -13.2400, 'Congo Cross Road', '5', NULL, 'Congo Cross Junction', 'residential', 'verified', 0.86),
('SL-1102-001-000002-5', '1102-001', ST_SetSRID(ST_MakePoint(-13.2410, 8.4755), 4326), 8.4755, -13.2410, 'Savage Square', '10', 'Congo Market', 'Main Market Entrance', 'commercial', 'verified', 0.90),
('SL-1102-002-000001-6', '1102-002', ST_SetSRID(ST_MakePoint(-13.2420, 8.4730), 4326), 8.4730, -13.2420, 'Foulah Town Road', '33', NULL, 'Near Foulah Town Mosque', 'residential', 'verified', 0.84),
('SL-1102-003-000001-7', '1102-003', ST_SetSRID(ST_MakePoint(-13.2450, 8.4760), 4326), 8.4760, -13.2450, 'Murray Town Road', '21', 'Murray Town Barracks', 'Military Area', 'government', 'verified', 0.91);

-- Brookfields / New England (1103)
INSERT INTO addresses (pda_id, zone_code, location, latitude, longitude, street_name, house_number, building_name, landmark_primary, address_type, verification_status, confidence_score)
VALUES
('SL-1103-001-000001-8', '1103-001', ST_SetSRID(ST_MakePoint(-13.2500, 8.4650), 4326), 8.4650, -13.2500, 'Brookfields Road', '14', 'Brookfields Hotel', 'Near Stadium', 'commercial', 'verified', 0.89),
('SL-1103-001-000002-9', '1103-001', ST_SetSRID(ST_MakePoint(-13.2510, 8.4655), 4326), 8.4655, -13.2510, 'Stadium Road', '1', 'National Stadium', 'Main Gate', 'commercial', 'verified', 0.95),
('SL-1103-002-000001-0', '1103-002', ST_SetSRID(ST_MakePoint(-13.2520, 8.4640), 4326), 8.4640, -13.2520, 'New England Road', '28', NULL, 'Near Mosque', 'residential', 'verified', 0.83),
('SL-1103-003-000001-1', '1103-003', ST_SetSRID(ST_MakePoint(-13.2530, 8.4630), 4326), 8.4630, -13.2530, 'Tengbeh Town Road', '16', 'Tengbeh Town Community Center', 'Near Market', 'residential', 'verified', 0.81);

-- Hill Station / Wilberforce (1104)
INSERT INTO addresses (pda_id, zone_code, location, latitude, longitude, street_name, house_number, building_name, landmark_primary, address_type, verification_status, confidence_score)
VALUES
('SL-1104-001-000001-2', '1104-001', ST_SetSRID(ST_MakePoint(-13.2600, 8.4550), 4326), 8.4550, -13.2600, 'Hill Station Road', '3', 'Hill Station Lodge', 'Presidential Area', 'government', 'verified', 0.92),
('SL-1104-001-000002-3', '1104-001', ST_SetSRID(ST_MakePoint(-13.2610, 8.4545), 4326), 8.4545, -13.2610, 'Hill Station Road', '15', 'State Lodge', 'Near Hill Station', 'government', 'verified', 0.93),
('SL-1104-002-000001-4', '1104-002', ST_SetSRID(ST_MakePoint(-13.2620, 8.4560), 4326), 8.4560, -13.2620, 'Wilberforce Street', '22', 'Military Hospital', '34 Military Hospital', 'government', 'verified', 0.94),
('SL-1104-003-000001-5', '1104-003', ST_SetSRID(ST_MakePoint(-13.2580, 8.4580), 4326), 8.4580, -13.2580, 'Signal Hill Road', '8', 'SLBC Tower', 'Broadcasting Tower', 'commercial', 'verified', 0.90);

-- Lumley / Aberdeen (1105)
INSERT INTO addresses (pda_id, zone_code, location, latitude, longitude, street_name, house_number, building_name, landmark_primary, address_type, verification_status, confidence_score)
VALUES
('SL-1105-001-000001-6', '1105-001', ST_SetSRID(ST_MakePoint(-13.2800, 8.4400), 4326), 8.4400, -13.2800, 'Lumley Beach Road', '50', 'Radisson Blu Hotel', 'Near Lumley Beach', 'commercial', 'verified', 0.96),
('SL-1105-001-000002-7', '1105-001', ST_SetSRID(ST_MakePoint(-13.2810, 8.4405), 4326), 8.4405, -13.2810, 'Lumley Beach Road', '65', 'Family Kingdom', 'Amusement Park', 'commercial', 'verified', 0.94),
('SL-1105-001-000003-8', '1105-001', ST_SetSRID(ST_MakePoint(-13.2790, 8.4410), 4326), 8.4410, -13.2790, 'Lumley Beach Road', '32', 'China Town Restaurant', 'Beach Side', 'commercial', 'verified', 0.91),
('SL-1105-002-000001-9', '1105-002', ST_SetSRID(ST_MakePoint(-13.2750, 8.4450), 4326), 8.4450, -13.2750, 'Aberdeen Road', '12', 'Aberdeen Ferry Terminal', 'Ferry to Airport', 'commercial', 'verified', 0.93),
('SL-1105-002-000002-0', '1105-002', ST_SetSRID(ST_MakePoint(-13.2760, 8.4445), 4326), 8.4445, -13.2760, 'Aberdeen Village Road', '7', 'Aberdeen Women Center', 'Near Aberdeen Bridge', 'commercial', 'verified', 0.87),
('SL-1105-003-000001-1', '1105-003', ST_SetSRID(ST_MakePoint(-13.2900, 8.4350), 4326), 8.4350, -13.2900, 'Cockle Bay Road', '3', NULL, 'Fishing Village', 'residential', 'verified', 0.80);

-- Kissy Area (1107)
INSERT INTO addresses (pda_id, zone_code, location, latitude, longitude, street_name, house_number, building_name, landmark_primary, address_type, verification_status, confidence_score)
VALUES
('SL-1107-001-000001-2', '1107-001', ST_SetSRID(ST_MakePoint(-13.1950, 8.4600), 4326), 8.4600, -13.1950, 'Kissy Road', '100', 'Kissy Mental Hospital', 'Hospital Junction', 'government', 'verified', 0.89),
('SL-1107-001-000002-3', '1107-001', ST_SetSRID(ST_MakePoint(-13.1960, 8.4605), 4326), 8.4605, -13.1960, 'Kissy Road', '120', 'Kissy Market', 'Main Market', 'commercial', 'verified', 0.88),
('SL-1107-002-000001-4', '1107-002', ST_SetSRID(ST_MakePoint(-13.1900, 8.4580), 4326), 8.4580, -13.1900, 'Kissy Brook Road', '45', NULL, 'Near Kissy Health Center', 'residential', 'verified', 0.82),
('SL-1107-003-000001-5', '1107-003', ST_SetSRID(ST_MakePoint(-13.1850, 8.4560), 4326), 8.4560, -13.1850, 'Kissy Mess Mess Road', '23', NULL, 'Near Primary School', 'residential', 'pending', 0.78);

-- Wellington / Portee (1108)
INSERT INTO addresses (pda_id, zone_code, location, latitude, longitude, street_name, house_number, building_name, landmark_primary, address_type, verification_status, confidence_score)
VALUES
('SL-1108-001-000001-6', '1108-001', ST_SetSRID(ST_MakePoint(-13.1700, 8.4500), 4326), 8.4500, -13.1700, 'Wellington Road', '55', 'Wellington Industrial Estate', 'Factory Area', 'commercial', 'verified', 0.86),
('SL-1108-001-000002-7', '1108-001', ST_SetSRID(ST_MakePoint(-13.1710, 8.4505), 4326), 8.4505, -13.1710, 'Wellington Road', '78', 'PMB Factory', 'Near Police Station', 'commercial', 'verified', 0.84),
('SL-1108-002-000001-8', '1108-002', ST_SetSRID(ST_MakePoint(-13.1650, 8.4480), 4326), 8.4480, -13.1650, 'Portee Road', '12', NULL, 'Near Portee Junction', 'residential', 'verified', 0.81);

-- Waterloo (1000)
INSERT INTO addresses (pda_id, zone_code, location, latitude, longitude, street_name, house_number, building_name, landmark_primary, address_type, verification_status, confidence_score)
VALUES
('SL-1000-001-000001-9', '1000-001', ST_SetSRID(ST_MakePoint(-13.0710, 8.3390), 4326), 8.3390, -13.0710, 'Waterloo Main Road', '1', 'Waterloo Junction Market', 'Main Junction', 'commercial', 'verified', 0.88),
('SL-1000-001-000002-0', '1000-001', ST_SetSRID(ST_MakePoint(-13.0720, 8.3385), 4326), 8.3385, -13.0720, 'Waterloo Main Road', '15', 'Waterloo Police Station', 'Near Market', 'government', 'verified', 0.90),
('SL-1000-002-000001-1', '1000-002', ST_SetSRID(ST_MakePoint(-13.0700, 8.3400), 4326), 8.3400, -13.0700, 'Waterloo Highway', '25', 'Waterloo Junction', 'Highway Junction', 'commercial', 'verified', 0.85);

-- Bo City (4100)
INSERT INTO addresses (pda_id, zone_code, location, latitude, longitude, street_name, house_number, building_name, landmark_primary, address_type, verification_status, confidence_score)
VALUES
('SL-4100-001-000001-2', '4100-001', ST_SetSRID(ST_MakePoint(-11.7383, 7.9647), 4326), 7.9647, -11.7383, 'Bojon Street', '1', 'Bo City Council', 'Town Center', 'government', 'verified', 0.92),
('SL-4100-001-000002-3', '4100-001', ST_SetSRID(ST_MakePoint(-11.7390, 7.9650), 4326), 7.9650, -11.7390, 'Damballa Road', '25', 'Bo Main Market', 'Market Entrance', 'commercial', 'verified', 0.91),
('SL-4100-001-000003-4', '4100-001', ST_SetSRID(ST_MakePoint(-11.7380, 7.9655), 4326), 7.9655, -11.7380, 'Tikonko Road', '8', 'Bo Government Hospital', 'Near Hospital', 'government', 'verified', 0.93),
('SL-4100-002-000001-5', '4100-002', ST_SetSRID(ST_MakePoint(-11.7350, 7.9680), 4326), 7.9680, -11.7350, 'New London Road', '42', NULL, 'Near Bo School', 'residential', 'verified', 0.85),
('SL-4100-002-000002-6', '4100-002', ST_SetSRID(ST_MakePoint(-11.7360, 7.9675), 4326), 7.9675, -11.7360, 'New London Road', '56', 'Bo Commercial Bank', 'Banking Area', 'commercial', 'verified', 0.88);

-- Kenema City (5200)
INSERT INTO addresses (pda_id, zone_code, location, latitude, longitude, street_name, house_number, building_name, landmark_primary, address_type, verification_status, confidence_score)
VALUES
('SL-5200-001-000001-7', '5200-001', ST_SetSRID(ST_MakePoint(-11.1875, 7.8767), 4326), 7.8767, -11.1875, 'Hangha Road', '1', 'Kenema City Council', 'City Center', 'government', 'verified', 0.93),
('SL-5200-001-000002-8', '5200-001', ST_SetSRID(ST_MakePoint(-11.1880, 7.8770), 4326), 7.8770, -11.1880, 'Combema Road', '18', 'Kenema Main Market', 'Market Square', 'commercial', 'verified', 0.91),
('SL-5200-001-000003-9', '5200-001', ST_SetSRID(ST_MakePoint(-11.1870, 7.8775), 4326), 7.8775, -11.1870, 'Blama Road', '5', 'Kenema Government Hospital', 'Hospital Area', 'government', 'verified', 0.94),
('SL-5200-002-000001-0', '5200-002', ST_SetSRID(ST_MakePoint(-11.1840, 7.8800), 4326), 7.8800, -11.1840, 'Nyandehun Road', '22', NULL, 'Near Nyandehun Market', 'residential', 'verified', 0.84);

-- Koidu City (5300)
INSERT INTO addresses (pda_id, zone_code, location, latitude, longitude, street_name, house_number, building_name, landmark_primary, address_type, verification_status, confidence_score)
VALUES
('SL-5300-001-000001-1', '5300-001', ST_SetSRID(ST_MakePoint(-10.9706, 8.6439), 4326), 8.6439, -10.9706, 'Main Street', '1', 'Koidu City Hall', 'City Center', 'government', 'verified', 0.92),
('SL-5300-001-000002-2', '5300-001', ST_SetSRID(ST_MakePoint(-10.9710, 8.6445), 4326), 8.6445, -10.9710, 'Lebanese Street', '15', 'Koidu Diamond Market', 'Trading Center', 'commercial', 'verified', 0.89),
('SL-5300-001-000003-3', '5300-001', ST_SetSRID(ST_MakePoint(-10.9700, 8.6450), 4326), 8.6450, -10.9700, 'Hospital Road', '3', 'Koidu Government Hospital', 'Hospital Junction', 'government', 'verified', 0.93),
('SL-5300-002-000001-4', '5300-002', ST_SetSRID(ST_MakePoint(-10.9680, 8.6470), 4326), 8.6470, -10.9680, 'New Sembehun Road', '28', NULL, 'Near New Sembehun School', 'residential', 'verified', 0.85);

-- Makeni City (2100)
INSERT INTO addresses (pda_id, zone_code, location, latitude, longitude, street_name, house_number, building_name, landmark_primary, address_type, verification_status, confidence_score)
VALUES
('SL-2100-001-000001-5', '2100-001', ST_SetSRID(ST_MakePoint(-12.0500, 8.8833), 4326), 8.8833, -12.0500, 'Azzolini Highway', '1', 'Makeni City Council', 'City Center', 'government', 'verified', 0.91),
('SL-2100-001-000002-6', '2100-001', ST_SetSRID(ST_MakePoint(-12.0510, 8.8840), 4326), 8.8840, -12.0510, 'Rogbaneh Road', '20', 'Makeni Main Market', 'Market Area', 'commercial', 'verified', 0.90),
('SL-2100-001-000003-7', '2100-001', ST_SetSRID(ST_MakePoint(-12.0490, 8.8845), 4326), 8.8845, -12.0490, 'Magburaka Road', '8', 'Holy Spirit Hospital', 'Hospital Area', 'government', 'verified', 0.93),
('SL-2100-002-000001-8', '2100-002', ST_SetSRID(ST_MakePoint(-12.0450, 8.8870), 4326), 8.8870, -12.0450, 'Teko Road', '35', NULL, 'Near Teko Market', 'residential', 'verified', 0.84);

-- Port Loko (3200)
INSERT INTO addresses (pda_id, zone_code, location, latitude, longitude, street_name, house_number, building_name, landmark_primary, address_type, verification_status, confidence_score)
VALUES
('SL-3200-001-000001-9', '3200-001', ST_SetSRID(ST_MakePoint(-12.7833, 8.7667), 4326), 8.7667, -12.7833, 'Bai Bureh Road', '1', 'Port Loko District Council', 'Town Center', 'government', 'verified', 0.90),
('SL-3200-001-000002-0', '3200-001', ST_SetSRID(ST_MakePoint(-12.7840, 8.7670), 4326), 8.7670, -12.7840, 'Main Street', '12', 'Port Loko Market', 'Market Square', 'commercial', 'verified', 0.88);

-- Update address counts in postal_zones
UPDATE postal_zones SET address_sequence = (SELECT COUNT(*) FROM addresses WHERE addresses.zone_code = postal_zones.zone_code);
