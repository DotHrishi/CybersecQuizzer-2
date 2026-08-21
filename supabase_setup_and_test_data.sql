-- ============================================================================
-- CYBERSECQUIZZER: MASTER SUPABASE DATABASE MIGRATION & TEST DATA SCRIPT
-- File: supabase_setup_and_test_data.sql
-- 
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard -> SQL Editor
-- 2. Create a "New Query", paste the entire contents of this file, and click "Run"
-- 
-- CREDENTIALS CREATED:
-- All Admin Accounts Password:   Admin@123
-- All Student Accounts Password: Student@123
-- ============================================================================

-- ============================================================================
-- SECTION 1: SCHEMA MIGRATION, TABLES & INDEXES
-- ============================================================================

-- 1.1 Colleges Table
CREATE TABLE IF NOT EXISTS colleges (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  identifier TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 College Departments Table
CREATE TABLE IF NOT EXISTS college_departments (
  id SERIAL PRIMARY KEY,
  "collegeId" INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  "departmentName" TEXT NOT NULL,
  "registrationKey" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_college_dept UNIQUE ("collegeId", "departmentName")
);

-- 1.3 User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  "fullName" TEXT NOT NULL,
  nickname TEXT NOT NULL UNIQUE,
  "isNicknameSame" BOOLEAN NOT NULL DEFAULT FALSE,
  email TEXT NOT NULL,
  "emailType" TEXT NOT NULL DEFAULT 'college',
  "collegeId" INTEGER REFERENCES colleges(id) ON DELETE SET NULL,
  "collegeDepartmentId" INTEGER REFERENCES college_departments(id) ON DELETE SET NULL,
  "passwordHash" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.4 Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  name TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  "collegeId" INTEGER REFERENCES colleges(id) ON DELETE SET NULL,
  "collegeDepartmentId" INTEGER REFERENCES college_departments(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.5 Questions Table
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  "questionText" TEXT NOT NULL,
  "optionA" TEXT NOT NULL,
  "optionB" TEXT NOT NULL,
  "optionC" TEXT NOT NULL,
  "optionD" TEXT NOT NULL,
  "correctOption" TEXT NOT NULL,
  category TEXT DEFAULT 'General Security',
  difficulty TEXT DEFAULT 'Medium',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.6 User Attempts Table
CREATE TABLE IF NOT EXISTS user_attempts (
  id SERIAL PRIMARY KEY,
  "userName" TEXT NOT NULL,
  "quizDate" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL,
  score INTEGER NOT NULL,
  "bonusPoints" INTEGER NOT NULL DEFAULT 0,
  "totalPoints" NUMERIC NOT NULL,
  "responseTimeMs" INTEGER NOT NULL,
  category TEXT DEFAULT 'General Security',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.7 Ensure columns exist on legacy tables
ALTER TABLE IF EXISTS user_attempts ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General Security';
ALTER TABLE IF EXISTS user_profiles ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE IF EXISTS user_profiles ADD COLUMN IF NOT EXISTS "collegeId" INTEGER;
ALTER TABLE IF EXISTS user_profiles ADD COLUMN IF NOT EXISTS "collegeDepartmentId" INTEGER;
ALTER TABLE IF EXISTS admin_users ADD COLUMN IF NOT EXISTS "collegeId" INTEGER;
ALTER TABLE IF EXISTS admin_users ADD COLUMN IF NOT EXISTS "collegeDepartmentId" INTEGER;

-- 1.8 Performance Indexes
CREATE INDEX IF NOT EXISTS idx_dept_reg_key ON college_departments(LOWER("registrationKey"));
CREATE INDEX IF NOT EXISTS idx_dept_college ON college_departments("collegeId");
CREATE INDEX IF NOT EXISTS idx_profile_dept ON user_profiles("collegeDepartmentId");
CREATE INDEX IF NOT EXISTS idx_profile_college ON user_profiles("collegeId");
CREATE INDEX IF NOT EXISTS idx_profile_nick_lower ON user_profiles(LOWER(nickname));
CREATE INDEX IF NOT EXISTS idx_attempts_user_date ON user_attempts(LOWER("userName"), "quizDate");
CREATE INDEX IF NOT EXISTS idx_attempts_user_created ON user_attempts(LOWER("userName"), "createdAt");


-- ============================================================================
-- SECTION 2: DATABASE TRIGGERS & BUSINESS LOGIC ENFORCEMENT
-- ============================================================================

-- 2.1 Trigger for Auto-Syncing collegeId from collegeDepartmentId
CREATE OR REPLACE FUNCTION fn_sync_profile_college_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."collegeDepartmentId" IS NOT NULL THEN
    SELECT "collegeId" INTO NEW."collegeId"
    FROM college_departments
    WHERE id = NEW."collegeDepartmentId";
  END IF;

  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_user_profile_college ON user_profiles;
CREATE TRIGGER trg_sync_user_profile_college
BEFORE INSERT OR UPDATE OF "collegeDepartmentId" ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION fn_sync_profile_college_id();

DROP TRIGGER IF EXISTS trg_sync_admin_user_college ON admin_users;
CREATE TRIGGER trg_sync_admin_user_college
BEFORE INSERT OR UPDATE OF "collegeDepartmentId" ON admin_users
FOR EACH ROW
EXECUTE FUNCTION fn_sync_profile_college_id();


-- 2.2 Database-Level 5-Day Mandatory Policy Enforcer Trigger
CREATE OR REPLACE FUNCTION fn_enforce_5_day_quiz_policy()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
  v_earliest_attempt TIMESTAMPTZ;
  v_account_age_days NUMERIC;
  v_clean_user TEXT;
BEGIN
  v_clean_user := LOWER(TRIM(NEW."userName"));

  -- 1. Fetch user profile
  SELECT * INTO v_profile
  FROM user_profiles
  WHERE LOWER(nickname) = v_clean_user
  LIMIT 1;

  -- 2. Fetch earliest attempt (fallback)
  SELECT MIN("createdAt") INTO v_earliest_attempt
  FROM user_attempts
  WHERE LOWER(TRIM("userName")) = v_clean_user;

  -- 3. Calculate age in days
  IF v_profile."createdAt" IS NOT NULL THEN
    v_account_age_days := EXTRACT(EPOCH FROM (NOW() - v_profile."createdAt")) / 86400.0;
  ELSIF v_earliest_attempt IS NOT NULL THEN
    v_account_age_days := EXTRACT(EPOCH FROM (NOW() - v_earliest_attempt)) / 86400.0;
  ELSE
    v_account_age_days := 0;
  END IF;

  -- 4. If account is older than 5 days, strictly require department key + password
  IF v_account_age_days > 5.0 THEN
    IF v_profile.id IS NULL THEN
      RAISE EXCEPTION 'PROFILE_INCOMPLETE: 5-day grace period has expired for user "%". A student profile with college registration key and password is required.', NEW."userName"
      USING ERRCODE = 'P0001';
    END IF;

    IF v_profile."collegeDepartmentId" IS NULL THEN
      RAISE EXCEPTION 'REGISTRATION_KEY_REQUIRED: 5-day grace period has expired for user "%". Please enter your department registration key in your profile.', NEW."userName"
      USING ERRCODE = 'P0001';
    END IF;

    IF v_profile."passwordHash" IS NULL OR TRIM(v_profile."passwordHash") = '' THEN
      RAISE EXCEPTION 'PASSWORD_REQUIRED: 5-day grace period has expired for user "%". Please set a secure password in your profile.', NEW."userName"
      USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_5_day_quiz_policy ON user_attempts;
CREATE TRIGGER trg_enforce_5_day_quiz_policy
BEFORE INSERT ON user_attempts
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_5_day_quiz_policy();


-- 2.3 Real-Time Student Grace Status Audit View
CREATE OR REPLACE VIEW v_student_grace_status AS
WITH user_timeline AS (
  SELECT 
    p.id AS profile_id,
    p.nickname,
    p."fullName",
    p.email,
    p."collegeId",
    p."collegeDepartmentId",
    p."passwordHash",
    p."createdAt" AS profile_created_at,
    COALESCE(MIN(a."createdAt"), p."createdAt") AS earliest_activity_at
  FROM user_profiles p
  LEFT JOIN user_attempts a ON LOWER(TRIM(a."userName")) = LOWER(TRIM(p.nickname))
  GROUP BY p.id, p.nickname, p."fullName", p.email, p."collegeId", p."collegeDepartmentId", p."passwordHash", p."createdAt"
)
SELECT 
  t.profile_id,
  t.nickname,
  t."fullName",
  t.email,
  c.name AS college_name,
  d."departmentName" AS department_name,
  d."registrationKey" AS current_registration_key,
  ROUND((EXTRACT(EPOCH FROM (NOW() - t.earliest_activity_at)) / 86400.0)::numeric, 1) AS account_age_days,
  GREATEST(0, ROUND((5.0 - (EXTRACT(EPOCH FROM (NOW() - t.earliest_activity_at)) / 86400.0))::numeric, 1)) AS days_remaining_in_grace,
  CASE 
    WHEN (EXTRACT(EPOCH FROM (NOW() - t.earliest_activity_at)) / 86400.0) > 5.0 THEN TRUE 
    ELSE FALSE 
  END AS is_beyond_grace_period,
  CASE 
    WHEN t."collegeDepartmentId" IS NOT NULL THEN TRUE 
    ELSE FALSE 
  END AS has_valid_department,
  CASE 
    WHEN t."passwordHash" IS NOT NULL AND TRIM(t."passwordHash") <> '' THEN TRUE 
    ELSE FALSE 
  END AS has_password,
  CASE 
    WHEN t."collegeDepartmentId" IS NOT NULL AND t."passwordHash" IS NOT NULL AND TRIM(t."passwordHash") <> '' THEN TRUE 
    ELSE FALSE 
  END AS is_profile_complete,
  CASE 
    WHEN (EXTRACT(EPOCH FROM (NOW() - t.earliest_activity_at)) / 86400.0) <= 5.0 THEN 'ALLOWED_GRACE_PERIOD'
    WHEN t."collegeDepartmentId" IS NOT NULL AND t."passwordHash" IS NOT NULL AND TRIM(t."passwordHash") <> '' THEN 'ALLOWED_COMPLETED'
    WHEN t."collegeDepartmentId" IS NULL THEN 'BLOCKED_REGISTRATION_KEY_REQUIRED'
    WHEN t."passwordHash" IS NULL OR TRIM(t."passwordHash") = '' THEN 'BLOCKED_PASSWORD_REQUIRED'
    ELSE 'BLOCKED_PROFILE_INCOMPLETE'
  END AS quiz_access_status
FROM user_timeline t
LEFT JOIN colleges c ON c.id = t."collegeId"
LEFT JOIN college_departments d ON d.id = t."collegeDepartmentId";


-- 2.4 Fast Key Verification RPC Function
CREATE OR REPLACE FUNCTION fn_validate_registration_key(p_key TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  department_id INTEGER,
  department_name TEXT,
  college_id INTEGER,
  college_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE AS is_valid,
    d.id AS department_id,
    d."departmentName" AS department_name,
    c.id AS college_id,
    c.name AS college_name
  FROM college_departments d
  JOIN colleges c ON c.id = d."collegeId"
  WHERE LOWER(TRIM(d."registrationKey")) = LOWER(TRIM(p_key))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- SECTION 3: SEED TEST DATA (COLLEGES, DEPTS, ADMINS, STUDENTS, ATTEMPTS)
-- ============================================================================

-- 3.1 Colleges
INSERT INTO colleges (name, identifier, "createdAt", "updatedAt")
VALUES 
  ('MIT - WPU University Pune', 'MITWPU', NOW(), NOW())
ON CONFLICT (identifier) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = NOW();

INSERT INTO colleges (name, identifier, "createdAt", "updatedAt")
VALUES 
  ('COEP Technological University', 'COEP', NOW(), NOW())
ON CONFLICT (identifier) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = NOW();

INSERT INTO colleges (name, identifier, "createdAt", "updatedAt")
VALUES 
  ('ABC College of Engineering', 'ABCCOE', NOW(), NOW())
ON CONFLICT (identifier) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = NOW();


-- 3.2 Departments & Registration Keys
INSERT INTO college_departments ("collegeId", "departmentName", "registrationKey", "createdAt", "updatedAt")
SELECT id, 'Computer Science & Engineering', 'MITCSE2026', NOW(), NOW()
FROM colleges WHERE identifier = 'MITWPU'
ON CONFLICT ("registrationKey") DO UPDATE 
SET "departmentName" = EXCLUDED."departmentName", "updatedAt" = NOW();

INSERT INTO college_departments ("collegeId", "departmentName", "registrationKey", "createdAt", "updatedAt")
SELECT id, 'Information Technology', 'MITIT2026', NOW(), NOW()
FROM colleges WHERE identifier = 'MITWPU'
ON CONFLICT ("registrationKey") DO UPDATE 
SET "departmentName" = EXCLUDED."departmentName", "updatedAt" = NOW();

INSERT INTO college_departments ("collegeId", "departmentName", "registrationKey", "createdAt", "updatedAt")
SELECT id, 'Computer Engineering', 'COEPCSE', NOW(), NOW()
FROM colleges WHERE identifier = 'COEP'
ON CONFLICT ("registrationKey") DO UPDATE 
SET "departmentName" = EXCLUDED."departmentName", "updatedAt" = NOW();

INSERT INTO college_departments ("collegeId", "departmentName", "registrationKey", "createdAt", "updatedAt")
SELECT id, 'Electronics & Telecommunication', 'COEPENTC', NOW(), NOW()
FROM colleges WHERE identifier = 'COEP'
ON CONFLICT ("registrationKey") DO UPDATE 
SET "departmentName" = EXCLUDED."departmentName", "updatedAt" = NOW();

INSERT INTO college_departments ("collegeId", "departmentName", "registrationKey", "createdAt", "updatedAt")
SELECT id, 'Mechanical Engineering', 'ABCMECH', NOW(), NOW()
FROM colleges WHERE identifier = 'ABCCOE'
ON CONFLICT ("registrationKey") DO UPDATE 
SET "departmentName" = EXCLUDED."departmentName", "updatedAt" = NOW();

INSERT INTO college_departments ("collegeId", "departmentName", "registrationKey", "createdAt", "updatedAt")
SELECT id, 'Civil Engineering', 'ABCCIVIL', NOW(), NOW()
FROM colleges WHERE identifier = 'ABCCOE'
ON CONFLICT ("registrationKey") DO UPDATE 
SET "departmentName" = EXCLUDED."departmentName", "updatedAt" = NOW();


-- 3.3 Admin Users (Password: Admin@123)
WITH dept AS (
  SELECT d.id AS dept_id, d."collegeId" AS col_id, d."registrationKey"
  FROM college_departments d
)
INSERT INTO admin_users (email, "passwordHash", name, active, "collegeId", "collegeDepartmentId", "createdAt", "updatedAt")
VALUES 
  -- MIT CSE Admin
  ('admin.mit.cse@wpu.edu.in', '28bfe752edacca169f126a293030e71c:26c0a6b4ebd1745d19a25f05e96dec3f4551a7eafc0644d3b031702ee314d73dfc2bb5a889212df320cfcbee5d8467a18219fc0328924e10b6710c7c5c107190', 'Prof. Sharma (CSE Admin)', TRUE, (SELECT col_id FROM dept WHERE "registrationKey" = 'MITCSE2026'), (SELECT dept_id FROM dept WHERE "registrationKey" = 'MITCSE2026'), NOW(), NOW()),
  
  -- MIT IT Admin
  ('admin.mit.it@wpu.edu.in', '28bfe752edacca169f126a293030e71c:26c0a6b4ebd1745d19a25f05e96dec3f4551a7eafc0644d3b031702ee314d73dfc2bb5a889212df320cfcbee5d8467a18219fc0328924e10b6710c7c5c107190', 'Prof. Kulkarni (IT Admin)', TRUE, (SELECT col_id FROM dept WHERE "registrationKey" = 'MITIT2026'), (SELECT dept_id FROM dept WHERE "registrationKey" = 'MITIT2026'), NOW(), NOW()),

  -- MIT College-Level Admin (All MIT Depts)
  ('admin.mit@wpu.edu.in', '28bfe752edacca169f126a293030e71c:26c0a6b4ebd1745d19a25f05e96dec3f4551a7eafc0644d3b031702ee314d73dfc2bb5a889212df320cfcbee5d8467a18219fc0328924e10b6710c7c5c107190', 'Dr. Joshi (MIT Dean)', TRUE, (SELECT id FROM colleges WHERE identifier = 'MITWPU'), NULL, NOW(), NOW()),

  -- COEP CSE Admin
  ('admin.coep.cse@coep.ac.in', '28bfe752edacca169f126a293030e71c:26c0a6b4ebd1745d19a25f05e96dec3f4551a7eafc0644d3b031702ee314d73dfc2bb5a889212df320cfcbee5d8467a18219fc0328924e10b6710c7c5c107190', 'Prof. Deshpande (COEP CSE)', TRUE, (SELECT col_id FROM dept WHERE "registrationKey" = 'COEPCSE'), (SELECT dept_id FROM dept WHERE "registrationKey" = 'COEPCSE'), NOW(), NOW()),

  -- COEP ENTC Admin
  ('admin.coep.entc@coep.ac.in', '28bfe752edacca169f126a293030e71c:26c0a6b4ebd1745d19a25f05e96dec3f4551a7eafc0644d3b031702ee314d73dfc2bb5a889212df320cfcbee5d8467a18219fc0328924e10b6710c7c5c107190', 'Dr. Patil (COEP ENTC)', TRUE, (SELECT col_id FROM dept WHERE "registrationKey" = 'COEPENTC'), (SELECT dept_id FROM dept WHERE "registrationKey" = 'COEPENTC'), NOW(), NOW()),

  -- ABC Mech Admin
  ('admin.abc.mech@abccoe.edu.in', '28bfe752edacca169f126a293030e71c:26c0a6b4ebd1745d19a25f05e96dec3f4551a7eafc0644d3b031702ee314d73dfc2bb5a889212df320cfcbee5d8467a18219fc0328924e10b6710c7c5c107190', 'Prof. Shinde (ABC Mech)', TRUE, (SELECT col_id FROM dept WHERE "registrationKey" = 'ABCMECH'), (SELECT dept_id FROM dept WHERE "registrationKey" = 'ABCMECH'), NOW(), NOW())
ON CONFLICT (email) DO UPDATE 
SET "passwordHash" = EXCLUDED."passwordHash", "collegeId" = EXCLUDED."collegeId", "collegeDepartmentId" = EXCLUDED."collegeDepartmentId", "updatedAt" = NOW();


-- 3.4 Student Profiles (Password: Student@123)
WITH dept AS (
  SELECT d.id AS dept_id, d."collegeId" AS col_id, d."registrationKey"
  FROM college_departments d
)
INSERT INTO user_profiles ("fullName", nickname, "isNicknameSame", email, "emailType", "collegeId", "collegeDepartmentId", "passwordHash", "createdAt", "updatedAt")
VALUES
  -- MIT CSE Students
  ('Aarav Sharma', 'aarav_mit', FALSE, 'aarav.sharma@mitwpu.edu.in', 'college', (SELECT col_id FROM dept WHERE "registrationKey" = 'MITCSE2026'), (SELECT dept_id FROM dept WHERE "registrationKey" = 'MITCSE2026'), '58c9911c617c31d75992c0da5f76559a:14db583c9d8e26df5abfb9f074ff38fbbfe2a0bcfd2e5cb32cd2e4fc393bb0b1d320165ac1afcf13e6c4221130743ee74a2a7e4e3cd23c6b50999d98f3db5b56', NOW() - INTERVAL '14 days', NOW()),
  ('Diya Patel', 'diya_mit', FALSE, 'diya.patel@mitwpu.edu.in', 'college', (SELECT col_id FROM dept WHERE "registrationKey" = 'MITCSE2026'), (SELECT dept_id FROM dept WHERE "registrationKey" = 'MITCSE2026'), '58c9911c617c31d75992c0da5f76559a:14db583c9d8e26df5abfb9f074ff38fbbfe2a0bcfd2e5cb32cd2e4fc393bb0b1d320165ac1afcf13e6c4221130743ee74a2a7e4e3cd23c6b50999d98f3db5b56', NOW() - INTERVAL '12 days', NOW()),
  ('Rohan Kulkarni', 'rohan_mit', FALSE, 'rohan.k@mitwpu.edu.in', 'college', (SELECT col_id FROM dept WHERE "registrationKey" = 'MITCSE2026'), (SELECT dept_id FROM dept WHERE "registrationKey" = 'MITCSE2026'), '58c9911c617c31d75992c0da5f76559a:14db583c9d8e26df5abfb9f074ff38fbbfe2a0bcfd2e5cb32cd2e4fc393bb0b1d320165ac1afcf13e6c4221130743ee74a2a7e4e3cd23c6b50999d98f3db5b56', NOW() - INTERVAL '10 days', NOW()),

  -- MIT IT Students
  ('Ananya Deshmukh', 'ananya_mit', FALSE, 'ananya.d@mitwpu.edu.in', 'college', (SELECT col_id FROM dept WHERE "registrationKey" = 'MITIT2026'), (SELECT dept_id FROM dept WHERE "registrationKey" = 'MITIT2026'), '58c9911c617c31d75992c0da5f76559a:14db583c9d8e26df5abfb9f074ff38fbbfe2a0bcfd2e5cb32cd2e4fc393bb0b1d320165ac1afcf13e6c4221130743ee74a2a7e4e3cd23c6b50999d98f3db5b56', NOW() - INTERVAL '8 days', NOW()),
  ('Vikram Joshi', 'vikram_mit', FALSE, 'vikram.j@mitwpu.edu.in', 'college', (SELECT col_id FROM dept WHERE "registrationKey" = 'MITIT2026'), (SELECT dept_id FROM dept WHERE "registrationKey" = 'MITIT2026'), '58c9911c617c31d75992c0da5f76559a:14db583c9d8e26df5abfb9f074ff38fbbfe2a0bcfd2e5cb32cd2e4fc393bb0b1d320165ac1afcf13e6c4221130743ee74a2a7e4e3cd23c6b50999d98f3db5b56', NOW() - INTERVAL '7 days', NOW()),

  -- COEP CSE Students
  ('Aditi Rao', 'aditi_coep', FALSE, 'aditi.rao@coep.ac.in', 'college', (SELECT col_id FROM dept WHERE "registrationKey" = 'COEPCSE'), (SELECT dept_id FROM dept WHERE "registrationKey" = 'COEPCSE'), '58c9911c617c31d75992c0da5f76559a:14db583c9d8e26df5abfb9f074ff38fbbfe2a0bcfd2e5cb32cd2e4fc393bb0b1d320165ac1afcf13e6c4221130743ee74a2a7e4e3cd23c6b50999d98f3db5b56', NOW() - INTERVAL '15 days', NOW()),
  ('Rahul Verma', 'rahul_coep', FALSE, 'rahul.v@coep.ac.in', 'college', (SELECT col_id FROM dept WHERE "registrationKey" = 'COEPCSE'), (SELECT dept_id FROM dept WHERE "registrationKey" = 'COEPCSE'), '58c9911c617c31d75992c0da5f76559a:14db583c9d8e26df5abfb9f074ff38fbbfe2a0bcfd2e5cb32cd2e4fc393bb0b1d320165ac1afcf13e6c4221130743ee74a2a7e4e3cd23c6b50999d98f3db5b56', NOW() - INTERVAL '11 days', NOW()),

  -- COEP ENTC Student
  ('Neha Shinde', 'neha_coep', FALSE, 'neha.s@coep.ac.in', 'college', (SELECT col_id FROM dept WHERE "registrationKey" = 'COEPENTC'), (SELECT dept_id FROM dept WHERE "registrationKey" = 'COEPENTC'), '58c9911c617c31d75992c0da5f76559a:14db583c9d8e26df5abfb9f074ff38fbbfe2a0bcfd2e5cb32cd2e4fc393bb0b1d320165ac1afcf13e6c4221130743ee74a2a7e4e3cd23c6b50999d98f3db5b56', NOW() - INTERVAL '9 days', NOW()),

  -- ABC Mech Student
  ('Sameer Patil', 'sameer_abc', FALSE, 'sameer.p@abccoe.edu.in', 'college', (SELECT col_id FROM dept WHERE "registrationKey" = 'ABCMECH'), (SELECT dept_id FROM dept WHERE "registrationKey" = 'ABCMECH'), '58c9911c617c31d75992c0da5f76559a:14db583c9d8e26df5abfb9f074ff38fbbfe2a0bcfd2e5cb32cd2e4fc393bb0b1d320165ac1afcf13e6c4221130743ee74a2a7e4e3cd23c6b50999d98f3db5b56', NOW() - INTERVAL '6 days', NOW()),

  -- 5-DAY POLICY TEST CASES
  -- Case A: 2 days old (no key) -> Within Grace Period
  ('Newbie Student', 'newbie_grace', FALSE, 'newbie@gmail.com', 'personal', NULL, NULL, NULL, NOW() - INTERVAL '2 days', NOW()),
  -- Case B: 10 days old (no key/pass) -> Blocked by 5-day rule
  ('Expired Incomplete', 'expired_locked', FALSE, 'expired@gmail.com', 'personal', NULL, NULL, NULL, NOW() - INTERVAL '10 days', NOW()),
  -- Case C: 8 days old (has key, no password) -> Blocked by password rule
  ('Missing Password Student', 'expired_nopass', FALSE, 'nopass@mitwpu.edu.in', 'college', (SELECT col_id FROM dept WHERE "registrationKey" = 'MITCSE2026'), (SELECT dept_id FROM dept WHERE "registrationKey" = 'MITCSE2026'), NULL, NOW() - INTERVAL '8 days', NOW())
ON CONFLICT (nickname) DO UPDATE 
SET "collegeId" = EXCLUDED."collegeId", "collegeDepartmentId" = EXCLUDED."collegeDepartmentId", "passwordHash" = EXCLUDED."passwordHash", "updatedAt" = NOW();


-- 3.5 Quiz Attempts & Historical Activity
DELETE FROM user_attempts 
WHERE "userName" IN ('aarav_mit', 'diya_mit', 'rohan_mit', 'ananya_mit', 'vikram_mit', 'aditi_coep', 'rahul_coep', 'neha_coep', 'sameer_abc', 'newbie_grace');

INSERT INTO user_attempts ("userName", "quizDate", "isCorrect", score, "bonusPoints", "totalPoints", "responseTimeMs", category, "createdAt")
VALUES 
  -- Aarav Sharma (MIT CSE) - Top Performer
  ('aarav_mit', '2026-08-17', TRUE, 1, 10, 11.00, 3200, 'Phishing & Social Engineering', NOW() - INTERVAL '4 days'),
  ('aarav_mit', '2026-08-18', TRUE, 1, 8,   9.00, 4800, 'Password Security & Auth',   NOW() - INTERVAL '3 days'),
  ('aarav_mit', '2026-08-19', TRUE, 1, 10, 11.00, 2900, 'Network & Wi-Fi Security',   NOW() - INTERVAL '2 days'),
  ('aarav_mit', '2026-08-20', TRUE, 1, 8,   9.00, 5100, 'Malware & Ransomware',       NOW() - INTERVAL '1 day'),
  ('aarav_mit', '2026-08-21', TRUE, 1, 10, 11.00, 3100, 'Social Engineering',         NOW()),

  -- Diya Patel (MIT CSE) - High Scorer
  ('diya_mit', '2026-08-17', TRUE, 1, 8,   9.00, 4500, 'Phishing & Social Engineering', NOW() - INTERVAL '4 days'),
  ('diya_mit', '2026-08-18', TRUE, 1, 10, 11.00, 3100, 'Password Security & Auth',   NOW() - INTERVAL '3 days'),
  ('diya_mit', '2026-08-19', TRUE, 1, 6,   7.00, 7200, 'Network & Wi-Fi Security',   NOW() - INTERVAL '2 days'),
  ('diya_mit', '2026-08-20', TRUE, 1, 10, 11.00, 2800, 'Malware & Ransomware',       NOW() - INTERVAL '1 day'),
  ('diya_mit', '2026-08-21', TRUE, 1, 8,   9.00, 4900, 'Social Engineering',         NOW()),

  -- Rohan Kulkarni (MIT CSE) - Moderate
  ('rohan_mit', '2026-08-17', TRUE,  1, 6, 7.00,  8500, 'Phishing & Social Engineering', NOW() - INTERVAL '4 days'),
  ('rohan_mit', '2026-08-18', FALSE, 0, 0, 0.00, 14200, 'Password Security & Auth',   NOW() - INTERVAL '3 days'),
  ('rohan_mit', '2026-08-19', TRUE,  1, 4, 5.00, 11800, 'Network & Wi-Fi Security',   NOW() - INTERVAL '2 days'),
  ('rohan_mit', '2026-08-20', FALSE, 0, 0, 0.00, 18900, 'Malware & Ransomware',       NOW() - INTERVAL '1 day'),
  ('rohan_mit', '2026-08-21', TRUE,  1, 6, 7.00,  8900, 'Social Engineering',         NOW()),

  -- Ananya Deshmukh (MIT IT)
  ('ananya_mit', '2026-08-18', TRUE, 1, 10, 11.00, 2500, 'Password Security & Auth', NOW() - INTERVAL '3 days'),
  ('ananya_mit', '2026-08-19', TRUE, 1, 10, 11.00, 2700, 'Network & Wi-Fi Security', NOW() - INTERVAL '2 days'),
  ('ananya_mit', '2026-08-20', TRUE, 1, 8,   9.00, 4200, 'Malware & Ransomware',     NOW() - INTERVAL '1 day'),
  ('ananya_mit', '2026-08-21', TRUE, 1, 10, 11.00, 2900, 'Social Engineering',       NOW()),

  -- Vikram Joshi (MIT IT)
  ('vikram_mit', '2026-08-19', TRUE,  1, 8, 9.00, 4100, 'Network & Wi-Fi Security', NOW() - INTERVAL '2 days'),
  ('vikram_mit', '2026-08-20', FALSE, 0, 0, 0.00, 3900, 'Malware & Ransomware',     NOW() - INTERVAL '1 day'),
  ('vikram_mit', '2026-08-21', TRUE,  1, 8, 9.00, 4400, 'Social Engineering',       NOW()),

  -- Aditi Rao (COEP CSE) - Top Ranked
  ('aditi_coep', '2026-08-17', TRUE, 1, 10, 11.00, 2100, 'Phishing & Social Engineering', NOW() - INTERVAL '4 days'),
  ('aditi_coep', '2026-08-18', TRUE, 1, 10, 11.00, 2200, 'Password Security & Auth',   NOW() - INTERVAL '3 days'),
  ('aditi_coep', '2026-08-19', TRUE, 1, 10, 11.00, 1900, 'Network & Wi-Fi Security',   NOW() - INTERVAL '2 days'),
  ('aditi_coep', '2026-08-20', TRUE, 1, 10, 11.00, 2400, 'Malware & Ransomware',       NOW() - INTERVAL '1 day'),
  ('aditi_coep', '2026-08-21', TRUE, 1, 10, 11.00, 2000, 'Social Engineering',         NOW()),

  -- Rahul Verma (COEP CSE)
  ('rahul_coep', '2026-08-18', TRUE, 1, 8, 9.00, 4900, 'Password Security & Auth', NOW() - INTERVAL '3 days'),
  ('rahul_coep', '2026-08-19', TRUE, 1, 6, 7.00, 7100, 'Network & Wi-Fi Security', NOW() - INTERVAL '2 days'),
  ('rahul_coep', '2026-08-20', TRUE, 1, 8, 9.00, 5200, 'Malware & Ransomware',     NOW() - INTERVAL '1 day'),
  ('rahul_coep', '2026-08-21', TRUE, 1, 6, 7.00, 6800, 'Social Engineering',       NOW()),

  -- Neha Shinde (COEP ENTC)
  ('neha_coep', '2026-08-19', TRUE, 1, 8, 9.00, 4300, 'Network & Wi-Fi Security', NOW() - INTERVAL '2 days'),
  ('neha_coep', '2026-08-20', TRUE, 1, 8, 9.00, 4600, 'Malware & Ransomware',     NOW() - INTERVAL '1 day'),
  ('neha_coep', '2026-08-21', TRUE, 1, 8, 9.00, 4500, 'Social Engineering',       NOW()),

  -- Sameer Patil (ABC Mechanical)
  ('sameer_abc', '2026-08-19', TRUE,  1, 6, 7.00, 7800, 'Network & Wi-Fi Security', NOW() - INTERVAL '2 days'),
  ('sameer_abc', '2026-08-20', TRUE,  1, 4, 5.00, 9900, 'Malware & Ransomware',     NOW() - INTERVAL '1 day'),
  ('sameer_abc', '2026-08-21', FALSE, 0, 0, 0.00, 8200, 'Social Engineering',       NOW()),

  -- Newbie Student (Fresh account - 1 attempt)
  ('newbie_grace', '2026-08-21', TRUE, 1, 6, 7.00, 6500, 'Social Engineering', NOW());


-- ============================================================================
-- SECTION 4: VERIFICATION AUDIT QUERY
-- ============================================================================
SELECT 
  c.name AS college_name,
  d."departmentName" AS department_name,
  d."registrationKey" AS registration_key,
  COUNT(DISTINCT p.id) AS enrolled_students,
  COUNT(DISTINCT a.id) AS assigned_admins
FROM college_departments d
JOIN colleges c ON c.id = d."collegeId"
LEFT JOIN user_profiles p ON p."collegeDepartmentId" = d.id
LEFT JOIN admin_users a ON a."collegeDepartmentId" = d.id
GROUP BY c.name, d."departmentName", d."registrationKey"
ORDER BY c.name, d."departmentName";
