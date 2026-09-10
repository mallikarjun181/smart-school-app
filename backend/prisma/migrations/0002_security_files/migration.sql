CREATE TYPE "FileVisibility" AS ENUM ('PUBLIC','PRIVATE');

CREATE TABLE "FileAsset" (
  "id" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "visibility" "FileVisibility" NOT NULL DEFAULT 'PRIVATE',
  "studentId" TEXT,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FileAsset_filename_key" ON "FileAsset"("filename");
CREATE INDEX "FileAsset_studentId_idx" ON "FileAsset"("studentId");
CREATE INDEX "FileAsset_uploadedById_idx" ON "FileAsset"("uploadedById");
CREATE INDEX "FileAsset_visibility_idx" ON "FileAsset"("visibility");

ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
