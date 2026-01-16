-- Migration: Add numeric_code column to districts table
-- This enables New Zealand-style numeric postal codes (XYZZ format)
-- Run with: psql -d your_database -f add_numeric_codes.sql

-- Add the numeric_code column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'districts' AND column_name = 'numeric_code'
    ) THEN
        ALTER TABLE districts ADD COLUMN numeric_code VARCHAR(2);
        CREATE INDEX IF NOT EXISTS idx_districts_numeric_code ON districts(numeric_code);
        RAISE NOTICE 'Added numeric_code column to districts table';
    ELSE
        RAISE NOTICE 'numeric_code column already exists';
    END IF;
END $$;

-- Update existing districts with their numeric codes
-- Format: XY where X=region(1-5), Y=district within region(0-9)

-- Western Area (Region 1)
UPDATE districts SET numeric_code = '11' WHERE full_code = 'WU';   -- Western Area Urban (Freetown): 1100-1199
UPDATE districts SET numeric_code = '10' WHERE full_code = 'WR';   -- Western Area Rural: 1000-1099

-- Northern Province (Region 2)
UPDATE districts SET numeric_code = '21' WHERE full_code = 'NBO';  -- Bombali: 2100-2199
UPDATE districts SET numeric_code = '22' WHERE full_code = 'NFA';  -- Falaba: 2200-2299
UPDATE districts SET numeric_code = '23' WHERE full_code = 'NKO';  -- Koinadugu: 2300-2399
UPDATE districts SET numeric_code = '24' WHERE full_code = 'NTO';  -- Tonkolili: 2400-2499
UPDATE districts SET numeric_code = '25' WHERE full_code = 'NKA';  -- Karene: 2500-2599

-- North West Province (Region 3)
UPDATE districts SET numeric_code = '31' WHERE full_code = 'NWKM'; -- Kambia: 3100-3199
UPDATE districts SET numeric_code = '32' WHERE full_code = 'NWPL'; -- Port Loko: 3200-3299

-- Southern Province (Region 4)
UPDATE districts SET numeric_code = '41' WHERE full_code = 'SBO';  -- Bo: 4100-4199
UPDATE districts SET numeric_code = '42' WHERE full_code = 'SBN';  -- Bonthe: 4200-4299
UPDATE districts SET numeric_code = '43' WHERE full_code = 'SMO';  -- Moyamba: 4300-4399
UPDATE districts SET numeric_code = '44' WHERE full_code = 'SPU';  -- Pujehun: 4400-4499

-- Eastern Province (Region 5)
UPDATE districts SET numeric_code = '51' WHERE full_code = 'EKL';  -- Kailahun: 5100-5199
UPDATE districts SET numeric_code = '52' WHERE full_code = 'EKE';  -- Kenema: 5200-5299
UPDATE districts SET numeric_code = '53' WHERE full_code = 'EKN';  -- Kono: 5300-5399

-- Verify the update
SELECT
    d.name as district_name,
    d.full_code,
    d.numeric_code,
    r.name as region_name,
    CONCAT(d.numeric_code, '00-', d.numeric_code, '99') as postal_range
FROM districts d
JOIN regions r ON d.region_id = r.id
ORDER BY d.numeric_code;

-- Show summary
SELECT
    'Migration complete!' as status,
    COUNT(*) as districts_updated,
    COUNT(numeric_code) as with_numeric_code
FROM districts;
