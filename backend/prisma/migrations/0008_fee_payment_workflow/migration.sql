ALTER TABLE "Fee" ADD COLUMN "paymentProof" TEXT;
ALTER TABLE "Fee" ADD COLUMN "paymentVerification" "PaymentVerification" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Fee" ADD COLUMN "verifiedBy" TEXT;
ALTER TABLE "Fee" ADD COLUMN "verifiedAt" TIMESTAMP(3);
ALTER TABLE "Fee" ADD COLUMN "receiptFile" TEXT;
ALTER TABLE "Fee" ADD COLUMN "receiptIssuedAt" TIMESTAMP(3);
ALTER TABLE "SchoolSettings" ADD COLUMN "paymentQr" TEXT;
