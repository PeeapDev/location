-- Migration: Add Plus Code (Open Location Code) support to addresses table
-- Plus Codes provide a universal location identifier alongside PDA-IDs
-- Format: 8FVC9G8F+5WX (full) or VX22+5WX (short with locality context)

-- Add plus_code column (full Plus Code, 11-12 chars for ~3m precision)
ALTER TABLE addresses
ADD COLUMN IF NOT EXISTS plus_code VARCHAR(15);

-- Add plus_code_short for locality-relative codes (shorter display format)
ALTER TABLE addresses
ADD COLUMN IF NOT EXISTS plus_code_short VARCHAR(10);

-- Add index for Plus Code lookups (important for search performance)
CREATE INDEX IF NOT EXISTS idx_addresses_plus_code ON addresses(plus_code);

-- Add comments for documentation
COMMENT ON COLUMN addresses.plus_code IS 'Full Plus Code (Open Location Code) derived from lat/lng, ~3m precision';
COMMENT ON COLUMN addresses.plus_code_short IS 'Short Plus Code relative to zone center, for display purposes';

-- Verify the columns were added
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'addresses' AND column_name IN ('plus_code', 'plus_code_short');
