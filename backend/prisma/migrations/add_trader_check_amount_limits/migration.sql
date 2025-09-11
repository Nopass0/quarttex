-- Add minCheckAmount and maxCheckAmount fields to User table
ALTER TABLE "User" ADD COLUMN "minCheckAmount" Float DEFAULT 100;
ALTER TABLE "User" ADD COLUMN "maxCheckAmount" Float DEFAULT 1000000;


