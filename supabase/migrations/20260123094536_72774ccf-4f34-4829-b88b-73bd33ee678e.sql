-- Update the callback URL to use www subdomain for consistency
UPDATE app_config 
SET value = '{"url": "https://www.sentra.africa"}'::jsonb 
WHERE key = 'live_callback_url';