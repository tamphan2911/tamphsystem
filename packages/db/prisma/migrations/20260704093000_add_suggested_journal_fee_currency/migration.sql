-- Store structured fee metadata for manually suggested journals.
ALTER TABLE "SuggestedJournal"
  ADD COLUMN "apcCurrency" "CurrencyCode" NOT NULL DEFAULT 'USD',
  ADD COLUMN "hasApcOption" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "submissionFeeCurrency" "CurrencyCode" NOT NULL DEFAULT 'USD';
