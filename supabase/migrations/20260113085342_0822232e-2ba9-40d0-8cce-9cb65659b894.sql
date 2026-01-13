UPDATE app_config 
SET value = '{"content": "Shipping Instructions: This order doesn''t factor shipping cost. We would confirm shipping cost to you after payment is made."}'::jsonb,
    updated_at = now()
WHERE key = 'terms_and_conditions';