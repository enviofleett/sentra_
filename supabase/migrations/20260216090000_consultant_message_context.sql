-- Add contextual fields to consultant_messages for richer conversation history
ALTER TABLE public.consultant_messages
ADD COLUMN IF NOT EXISTS product_id UUID NULL REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.consultant_messages
ADD COLUMN IF NOT EXISTS page_url TEXT NULL;

ALTER TABLE public.consultant_messages
ADD COLUMN IF NOT EXISTS context JSONB NULL;

