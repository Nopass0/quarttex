-- Add individual KKK fields to MerchantRateSource
ALTER TABLE "MerchantRateSource" ADD COLUMN "kkkPercent" DOUBLE PRECISION;
ALTER TABLE "MerchantRateSource" ADD COLUMN "kkkOperation" "KkkOperationType";

-- Add individual KKK fields to User (traders)
ALTER TABLE "User" ADD COLUMN "traderKkkPercent" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN "traderKkkOperation" "KkkOperationType";
