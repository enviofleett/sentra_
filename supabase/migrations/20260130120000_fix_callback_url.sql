-- Fix the callback URL to use localhost for development
-- This fixes the net::ERR_NAME_NOT_RESOLVED error when redirecting locally
UPDATE app_config 
SET value = '{"url": "http://localhost:5173"}'::jsonb 
WHERE key = 'live_callback_url';
