-- STEP 11: CREATE IMPORT CONFIGURATION TABLES

-- Table to store import file configurations
CREATE TABLE import_file_configs (
  id SERIAL PRIMARY KEY,
  config_name VARCHAR(100) NOT NULL UNIQUE,
  file_type VARCHAR(20) NOT NULL, -- 'file1' or 'file2'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store column mappings for each import configuration
CREATE TABLE import_column_mappings (
  id SERIAL PRIMARY KEY,
  config_id INTEGER NOT NULL REFERENCES import_file_configs(id) ON DELETE CASCADE,
  excel_column_name VARCHAR(255) NOT NULL,
  database_field VARCHAR(100) NOT NULL,
  data_type VARCHAR(20) DEFAULT 'text', -- 'text', 'number', 'date'
  is_required BOOLEAN DEFAULT false,
  default_value TEXT,
  validation_rules JSONB,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to track import sessions
CREATE TABLE import_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  admin_user VARCHAR(100) NOT NULL,
  file1_name VARCHAR(255),
  file2_name VARCHAR(255),
  file1_config_id INTEGER REFERENCES import_file_configs(id),
  file2_config_id INTEGER REFERENCES import_file_configs(id),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  error_records INTEGER DEFAULT 0,
  import_summary JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_import_column_mappings_config_id ON import_column_mappings(config_id);
CREATE INDEX idx_import_sessions_session_id ON import_sessions(session_id);
CREATE INDEX idx_import_sessions_status ON import_sessions(status);

-- Comments
COMMENT ON TABLE import_file_configs IS 'Configuration for different import file types';
COMMENT ON TABLE import_column_mappings IS 'Column mappings for Excel to database field mapping';
COMMENT ON TABLE import_sessions IS 'Track dual-file import sessions';
