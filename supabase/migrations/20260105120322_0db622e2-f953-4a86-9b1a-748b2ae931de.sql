-- Create a function to sanitize HTML content server-side
-- This uses a whitelist approach to only allow safe HTML tags
CREATE OR REPLACE FUNCTION public.sanitize_html(p_html text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result text;
BEGIN
  IF p_html IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Start with the input
  v_result := p_html;
  
  -- Remove script tags and their contents (case insensitive)
  v_result := regexp_replace(v_result, '<script[^>]*>.*?</script>', '', 'gi');
  
  -- Remove style tags and their contents
  v_result := regexp_replace(v_result, '<style[^>]*>.*?</style>', '', 'gi');
  
  -- Remove on* event handlers (onclick, onload, onerror, etc.)
  v_result := regexp_replace(v_result, '\s+on\w+\s*=\s*[''"][^''"]*[''"]', '', 'gi');
  v_result := regexp_replace(v_result, '\s+on\w+\s*=\s*[^\s>]+', '', 'gi');
  
  -- Remove javascript: URLs
  v_result := regexp_replace(v_result, 'javascript\s*:', '', 'gi');
  
  -- Remove data: URLs (can be used for XSS)
  v_result := regexp_replace(v_result, 'data\s*:', 'data-blocked:', 'gi');
  
  -- Remove vbscript: URLs
  v_result := regexp_replace(v_result, 'vbscript\s*:', '', 'gi');
  
  -- Remove iframe, object, embed, form, input tags
  v_result := regexp_replace(v_result, '<iframe[^>]*>.*?</iframe>', '', 'gi');
  v_result := regexp_replace(v_result, '<iframe[^>]*/>', '', 'gi');
  v_result := regexp_replace(v_result, '<object[^>]*>.*?</object>', '', 'gi');
  v_result := regexp_replace(v_result, '<embed[^>]*/>', '', 'gi');
  v_result := regexp_replace(v_result, '<form[^>]*>.*?</form>', '', 'gi');
  v_result := regexp_replace(v_result, '<input[^>]*/>', '', 'gi');
  v_result := regexp_replace(v_result, '<button[^>]*>.*?</button>', '', 'gi');
  
  -- Remove link tags (can be used to load external CSS/resources)
  v_result := regexp_replace(v_result, '<link[^>]*/>', '', 'gi');
  
  -- Remove meta tags
  v_result := regexp_replace(v_result, '<meta[^>]*/>', '', 'gi');
  
  -- Remove base tags
  v_result := regexp_replace(v_result, '<base[^>]*/>', '', 'gi');
  
  RETURN v_result;
END;
$$;

-- Create trigger function to sanitize product descriptions before insert/update
CREATE OR REPLACE FUNCTION public.sanitize_product_description()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.description IS NOT NULL THEN
    NEW.description := public.sanitize_html(NEW.description);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on products table
DROP TRIGGER IF EXISTS sanitize_product_description_trigger ON products;
CREATE TRIGGER sanitize_product_description_trigger
  BEFORE INSERT OR UPDATE OF description ON products
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_product_description();