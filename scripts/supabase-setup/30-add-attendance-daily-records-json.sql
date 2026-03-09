ALTER TABLE attendance_monthly
ADD COLUMN IF NOT EXISTS daily_records_json JSONB;
