-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Drop primary key on spendings table to allow hypertable conversion
-- TimescaleDB requires the partition column to be part of the primary key
ALTER TABLE spendings DROP CONSTRAINT IF EXISTS spendings_pkey;

-- Add composite primary key including the partition column
ALTER TABLE spendings ADD PRIMARY KEY (id, collected_at);

-- Convert spendings table to hypertable
-- Partition by collected_at with 1-week chunks
SELECT create_hypertable(
  'spendings',
  'collected_at',
  chunk_time_interval => INTERVAL '1 week',
  if_not_exists => TRUE,
  migrate_data => TRUE
);

-- Add check constraint to prevent self-referential loops in ad_objects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ad_objects_no_self_parent'
  ) THEN
    ALTER TABLE ad_objects ADD CONSTRAINT ad_objects_no_self_parent CHECK (id != parent_id);
  END IF;
END $$;
