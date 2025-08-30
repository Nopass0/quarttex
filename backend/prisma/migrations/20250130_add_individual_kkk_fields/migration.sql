-- Add individual KKK fields to MerchantRateSource (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'MerchantRateSource') THEN
        -- Check if columns don't exist before adding
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'MerchantRateSource' AND column_name = 'kkkPercent') THEN
            ALTER TABLE "MerchantRateSource" ADD COLUMN "kkkPercent" DOUBLE PRECISION;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'MerchantRateSource' AND column_name = 'kkkOperation') THEN
            ALTER TABLE "MerchantRateSource" ADD COLUMN "kkkOperation" "KkkOperationType";
        END IF;
    END IF;
END $$;

-- Add individual KKK fields to User (traders) (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') THEN
        -- Check if columns don't exist before adding
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'traderKkkPercent') THEN
            ALTER TABLE "User" ADD COLUMN "traderKkkPercent" DOUBLE PRECISION;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'traderKkkOperation') THEN
            ALTER TABLE "User" ADD COLUMN "traderKkkOperation" "KkkOperationType";
        END IF;
    END IF;
END $$;
