-- Preserve existing values; unknown nutrition is NULL, not zero.
ALTER TABLE food_records ALTER COLUMN calories DROP NOT NULL;
ALTER TABLE food_records ALTER COLUMN protein_grams DROP NOT NULL;
ALTER TABLE food_records ALTER COLUMN protein_grams DROP DEFAULT;
