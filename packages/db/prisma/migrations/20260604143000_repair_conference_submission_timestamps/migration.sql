-- Repair fields used by research detail pages when conference submissions exist.
ALTER TABLE IF EXISTS "ConferenceSubmission"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Publication detail cards use these optional metadata fields.
ALTER TABLE IF EXISTS "Publication"
  ADD COLUMN IF NOT EXISTS "scimagoLink" TEXT,
  ADD COLUMN IF NOT EXISTS "scopusLink" TEXT,
  ADD COLUMN IF NOT EXISTS "rank" TEXT;
