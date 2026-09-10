-- Performance-only indexes for high-volume tenant-scoped reads.
-- These indexes are additive and do not delete application rows.
CREATE INDEX IF NOT EXISTS "User_schoolId_role_status_idx" ON "User"("schoolId", "role", "status");
CREATE INDEX IF NOT EXISTS "Student_schoolId_classId_idx" ON "Student"("schoolId", "classId");
CREATE INDEX IF NOT EXISTS "ParentStudent_schoolId_studentId_idx" ON "ParentStudent"("schoolId", "studentId");
CREATE INDEX IF NOT EXISTS "Teacher_schoolId_assignedClassId_idx" ON "Teacher"("schoolId", "assignedClassId");
CREATE INDEX IF NOT EXISTS "SchoolClass_schoolId_className_section_academicYear_idx" ON "SchoolClass"("schoolId", "className", "section", "academicYear");
CREATE INDEX IF NOT EXISTS "Attendance_schoolId_classId_date_period_idx" ON "Attendance"("schoolId", "classId", "date", "period");
CREATE INDEX IF NOT EXISTS "Attendance_schoolId_studentId_date_idx" ON "Attendance"("schoolId", "studentId", "date");
CREATE INDEX IF NOT EXISTS "Homework_schoolId_classId_dueDate_idx" ON "Homework"("schoolId", "classId", "dueDate");
CREATE INDEX IF NOT EXISTS "HomeworkSubmission_schoolId_homeworkId_studentId_idx" ON "HomeworkSubmission"("schoolId", "homeworkId", "studentId");
CREATE INDEX IF NOT EXISTS "Mark_schoolId_classId_exam_idx" ON "Mark"("schoolId", "classId", "exam");
CREATE INDEX IF NOT EXISTS "Mark_schoolId_studentId_subjectId_idx" ON "Mark"("schoolId", "studentId", "subjectId");
CREATE INDEX IF NOT EXISTS "Timetable_schoolId_classId_day_period_idx" ON "Timetable"("schoolId", "classId", "day", "period");
CREATE INDEX IF NOT EXISTS "Timetable_schoolId_teacherId_day_period_idx" ON "Timetable"("schoolId", "teacherId", "day", "period");
CREATE INDEX IF NOT EXISTS "Notice_schoolId_publishedAt_idx" ON "Notice"("schoolId", "publishedAt");
CREATE INDEX IF NOT EXISTS "Event_schoolId_eventDate_idx" ON "Event"("schoolId", "eventDate");
CREATE INDEX IF NOT EXISTS "Certificate_schoolId_studentId_issuedDate_idx" ON "Certificate"("schoolId", "studentId", "issuedDate");
CREATE INDEX IF NOT EXISTS "Fee_schoolId_studentId_academicYear_idx" ON "Fee"("schoolId", "studentId", "academicYear");
CREATE INDEX IF NOT EXISTS "Fee_schoolId_status_dueDate_idx" ON "Fee"("schoolId", "status", "dueDate");
CREATE INDEX IF NOT EXISTS "FeeTransaction_schoolId_feeId_paymentDate_idx" ON "FeeTransaction"("schoolId", "feeId", "paymentDate");
CREATE INDEX IF NOT EXISTS "FeeTransaction_schoolId_verificationStatus_paymentDate_idx" ON "FeeTransaction"("schoolId", "verificationStatus", "paymentDate");
CREATE INDEX IF NOT EXISTS "Notification_schoolId_studentId_createdAt_idx" ON "Notification"("schoolId", "studentId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_schoolId_readAt_createdAt_idx" ON "Notification"("schoolId", "readAt", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_schoolId_timestamp_idx" ON "AuditLog"("schoolId", "timestamp");
CREATE INDEX IF NOT EXISTS "AuditLog_schoolId_userId_timestamp_idx" ON "AuditLog"("schoolId", "userId", "timestamp");
