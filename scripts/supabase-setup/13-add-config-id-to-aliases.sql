-- STEP 13: ADD CONFIG_ID TO COLUMN_ALIASES TABLE
-- Migration to add config_id column to link aliases with configurations

-- Add config_id column to column_aliases table
ALTER TABLE column_aliases 
ADD COLUMN config_id INTEGER REFERENCES mapping_configurations(id) ON DELETE SET NULL;

-- Drop the old unique constraint
ALTER TABLE column_aliases 
DROP CONSTRAINT IF EXISTS column_aliases_database_field_alias_name_key;

-- Add new unique constraint that includes config_id
ALTER TABLE column_aliases 
ADD CONSTRAINT column_aliases_unique_per_config 
UNIQUE(database_field, alias_name, COALESCE(config_id, 0));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_column_aliases_config_id ON column_aliases(config_id);
CREATE INDEX IF NOT EXISTS idx_column_aliases_database_field ON column_aliases(database_field);

-- Add comment for documentation
COMMENT ON COLUMN column_aliases.config_id IS 'Optional link to mapping configuration. NULL means global alias.';

-- Update existing aliases to be global (config_id = NULL)
-- This is safe since existing aliases will remain global

COMMIT;
