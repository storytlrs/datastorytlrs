-- Update existing 'social' records to 'always_on'
UPDATE reports SET type = 'always_on' WHERE type = 'social';