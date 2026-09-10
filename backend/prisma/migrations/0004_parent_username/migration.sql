-- Add a teacher-assigned username for parent login accounts
ALTER TABLE "User" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "User_schoolId_username_key" ON "User"("schoolId", "username");
