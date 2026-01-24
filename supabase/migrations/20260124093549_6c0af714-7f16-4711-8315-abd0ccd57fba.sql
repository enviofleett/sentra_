-- Add scent_notes JSONB column to products table
-- This stores fragrance notes (top, heart, base) extracted from Fragrantica during AI enrichment

ALTER TABLE public.products 
ADD COLUMN scent_notes jsonb DEFAULT NULL;

-- Add a comment to document the expected structure
COMMENT ON COLUMN public.products.scent_notes IS 'Fragrance notes in format: {"top": ["note1", "note2"], "heart": ["note1"], "base": ["note1", "note2"]}';