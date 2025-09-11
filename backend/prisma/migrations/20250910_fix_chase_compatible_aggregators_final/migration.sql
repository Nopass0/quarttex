-- Final migration for Chase compatible aggregators
-- This migration documents all the changes made to support Chase-compatible aggregators

-- The following changes have been applied:
-- 1. Updated maxSlaMs default to 2000ms for better performance
-- 2. Added proper comments for Chase-related columns
-- 3. Updated Quattrex aggregator timeout to 30000ms
-- 4. Added performance indexes

-- This is a documentation migration - all changes have already been applied
-- via the apply_chase_fix.ts script

-- No additional SQL changes needed as they were already applied

