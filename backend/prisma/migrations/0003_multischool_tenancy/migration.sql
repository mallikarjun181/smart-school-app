-- Multi-school tenant foundation. Existing development rows are assigned to default-school.
CREATE TABLE IF NOT EXISTS "School" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "School_slug_key" ON "School"("slug");
INSERT INTO "School" ("id","name","slug") VALUES ('default-school','Smart School','smart-school') ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "FileAsset" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "Parent" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "ParentStudent" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "SchoolClass" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "Homework" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "HomeworkSubmission" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "Mark" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "Timetable" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "Fee" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "FeeTransaction" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "SchoolInformation" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "SchoolSettings" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "AppState" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "schoolId" TEXT NOT NULL DEFAULT 'default-school';

CREATE INDEX IF NOT EXISTS "User_schoolId_idx" ON "User"("schoolId");
CREATE INDEX IF NOT EXISTS "FileAsset_schoolId_idx" ON "FileAsset"("schoolId");
CREATE INDEX IF NOT EXISTS "Parent_schoolId_idx" ON "Parent"("schoolId");
CREATE INDEX IF NOT EXISTS "Student_schoolId_idx" ON "Student"("schoolId");
CREATE INDEX IF NOT EXISTS "ParentStudent_schoolId_idx" ON "ParentStudent"("schoolId");
CREATE INDEX IF NOT EXISTS "Teacher_schoolId_idx" ON "Teacher"("schoolId");
CREATE INDEX IF NOT EXISTS "SchoolClass_schoolId_idx" ON "SchoolClass"("schoolId");
CREATE INDEX IF NOT EXISTS "Subject_schoolId_idx" ON "Subject"("schoolId");
CREATE INDEX IF NOT EXISTS "Attendance_schoolId_idx" ON "Attendance"("schoolId");
CREATE INDEX IF NOT EXISTS "Homework_schoolId_idx" ON "Homework"("schoolId");
CREATE INDEX IF NOT EXISTS "HomeworkSubmission_schoolId_idx" ON "HomeworkSubmission"("schoolId");
CREATE INDEX IF NOT EXISTS "Mark_schoolId_idx" ON "Mark"("schoolId");
CREATE INDEX IF NOT EXISTS "Timetable_schoolId_idx" ON "Timetable"("schoolId");
CREATE INDEX IF NOT EXISTS "Notice_schoolId_idx" ON "Notice"("schoolId");
CREATE INDEX IF NOT EXISTS "Event_schoolId_idx" ON "Event"("schoolId");
CREATE INDEX IF NOT EXISTS "Certificate_schoolId_idx" ON "Certificate"("schoolId");
CREATE INDEX IF NOT EXISTS "Fee_schoolId_idx" ON "Fee"("schoolId");
CREATE INDEX IF NOT EXISTS "FeeTransaction_schoolId_idx" ON "FeeTransaction"("schoolId");
CREATE UNIQUE INDEX IF NOT EXISTS "SchoolInformation_schoolId_key" ON "SchoolInformation"("schoolId");
CREATE INDEX IF NOT EXISTS "SchoolInformation_schoolId_idx" ON "SchoolInformation"("schoolId");
CREATE UNIQUE INDEX IF NOT EXISTS "SchoolSettings_schoolId_key" ON "SchoolSettings"("schoolId");
CREATE INDEX IF NOT EXISTS "SchoolSettings_schoolId_idx" ON "SchoolSettings"("schoolId");
CREATE UNIQUE INDEX IF NOT EXISTS "AppState_schoolId_key" ON "AppState"("schoolId");
CREATE INDEX IF NOT EXISTS "AppState_schoolId_idx" ON "AppState"("schoolId");
CREATE INDEX IF NOT EXISTS "Notification_schoolId_idx" ON "Notification"("schoolId");
CREATE INDEX IF NOT EXISTS "AuditLog_schoolId_idx" ON "AuditLog"("schoolId");

ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolClass" ADD CONSTRAINT "SchoolClass_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Fee" ADD CONSTRAINT "Fee_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeeTransaction" ADD CONSTRAINT "FeeTransaction_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolInformation" ADD CONSTRAINT "SchoolInformation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolSettings" ADD CONSTRAINT "SchoolSettings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppState" ADD CONSTRAINT "AppState_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
