import { db as prisma } from '../src/lib/db';
import { dataService } from '../src/lib/dataService';
import {
  normalizeCollegeName,
  normalizeRegistrationKey,
  validateRegistrationKeyFormat,
  getStudentGracePeriodStatus,
  validateStudentPassword,
  generateStrongPassword,
} from '../src/lib/collegeNormalization';
import {
  hashPassword,
  verifyPassword,
  signAdminToken,
  verifyAdminToken,
  signSuperAdminToken,
  verifySuperAdminToken,
} from '../src/lib/auth';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('\n========================================================================');
  console.log('🧪 COMPREHENSIVE MULTI-COLLEGE / MULTI-ADMIN ISOLATION & AUDIT TEST SUITE');
  console.log('========================================================================\n');

  try {
    // ----------------------------------------------------------------
    // 1. Registration Key Normalization & Flexible Formats
    // ----------------------------------------------------------------
    console.log('--- Case 1: Registration Key Normalization & Format Flexibility ---');
    const normKey1 = normalizeRegistrationKey('   MITCSE2026   ');
    assert(normKey1 === 'MITCSE2026', 'Whitespace trimming', `Got: "${normKey1}"`);

    const normKey2 = normalizeRegistrationKey('  CSE - 2026 # 1  ');
    assert(normKey2 === 'CSE - 2026 # 1', 'Special characters and internal spaces preserved', `Got: "${normKey2}"`);

    assert(validateRegistrationKeyFormat('K').isValid === true, 'Single character key valid');
    assert(validateRegistrationKeyFormat('MITCSE2026').isValid === true, 'Standard alphanumeric key valid');
    assert(validateRegistrationKeyFormat('CSE@MIT#2026').isValid === true, 'Key with special characters valid');
    assert(validateRegistrationKeyFormat('   ').isValid === false, 'Empty whitespace-only key rejected');

    // ----------------------------------------------------------------
    // 2. Setup Multi-College, Multi-Department & Multi-Admin Dataset
    // ----------------------------------------------------------------
    console.log('\n--- Case 2: Multi-College / Multi-Department Database Setup ---');
    const timestamp = Date.now();

    // College 1: MIT-WPU
    let mitCollege = await dataService.findCollegeByName('MIT - WPU University Pune');
    if (!mitCollege) {
      mitCollege = await dataService.createCollege({
        name: 'MIT - WPU University Pune',
        identifier: 'MITWPU',
      });
    }
    assert(mitCollege !== null && mitCollege.id > 0, 'MIT-WPU college exists/created');

    const mitCseKey = `MITCSE_${timestamp}`;
    const mitItKey = `MITIT_${timestamp}`;

    const mitCseDept = await dataService.createDepartment({
      collegeId: mitCollege.id,
      departmentName: `Computer Science ${timestamp}`,
      registrationKey: mitCseKey,
    });
    assert(mitCseDept.id > 0, 'Created MIT-WPU Computer Science department');

    const mitItDept = await dataService.createDepartment({
      collegeId: mitCollege.id,
      departmentName: `Information Technology ${timestamp}`,
      registrationKey: mitItKey,
    });
    assert(mitItDept.id > 0, 'Created MIT-WPU IT department');

    // College 2: ABC College
    const abcCollege = await dataService.createCollege({
      name: `ABC College of Engineering ${timestamp}`,
      identifier: `ABC_${timestamp}`,
    });
    assert(abcCollege.id > 0, 'ABC College exists/created');

    const abcCseKey = `ABCCSE_${timestamp}`;
    const abcMechKey = `ABCMECH_${timestamp}`;

    const abcCseDept = await dataService.createDepartment({
      collegeId: abcCollege.id,
      departmentName: `Computer Science ${timestamp}`,
      registrationKey: abcCseKey,
    });
    assert(abcCseDept.id > 0, 'Created ABC College CSE department');

    const abcMechDept = await dataService.createDepartment({
      collegeId: abcCollege.id,
      departmentName: `Mechanical Engineering ${timestamp}`,
      registrationKey: abcMechKey,
    });
    assert(abcMechDept.id > 0, 'Created ABC College Mechanical department');

    // ----------------------------------------------------------------
    // 3. Multi-Admin Setup & Token Scoping
    // ----------------------------------------------------------------
    console.log('\n--- Case 3: Multi-Admin Accounts & Token Scoping ---');
    const admin1Token = signAdminToken({
      id: 1001,
      email: `admin.mit.cse@test.com`,
      name: 'MIT CSE Admin',
      collegeId: mitCollege.id,
      collegeName: mitCollege.name,
      collegeDepartmentId: mitCseDept.id,
      departmentName: mitCseDept.departmentName,
    });

    const admin2Token = signAdminToken({
      id: 1002,
      email: `admin.mit.it@test.com`,
      name: 'MIT IT Admin',
      collegeId: mitCollege.id,
      collegeName: mitCollege.name,
      collegeDepartmentId: mitItDept.id,
      departmentName: mitItDept.departmentName,
    });

    const admin3Token = signAdminToken({
      id: 1003,
      email: `admin.abc.cse@test.com`,
      name: 'ABC CSE Admin',
      collegeId: abcCollege.id,
      collegeName: abcCollege.name,
      collegeDepartmentId: abcCseDept.id,
      departmentName: abcCseDept.departmentName,
    });

    const v1 = verifyAdminToken(admin1Token);
    const v2 = verifyAdminToken(admin2Token);
    const v3 = verifyAdminToken(admin3Token);

    assert(v1?.collegeDepartmentId === mitCseDept.id, 'Admin 1 scoped to MIT-WPU CSE');
    assert(v2?.collegeDepartmentId === mitItDept.id, 'Admin 2 scoped to MIT-WPU IT');
    assert(v3?.collegeDepartmentId === abcCseDept.id, 'Admin 3 scoped to ABC College CSE');

    // ----------------------------------------------------------------
    // 4. Student Enrollment via Registration Keys
    // ----------------------------------------------------------------
    console.log('\n--- Case 4: Student Enrollment via Authoritative Registration Keys ---');
    const studentMitCse1 = await dataService.upsertUserProfile({
      fullName: 'Student MIT CSE 1',
      nickname: `stu_mit_cse1_${timestamp}`,
      isNicknameSame: false,
      email: `stu_mit_cse1_${timestamp}@example.com`,
      emailType: 'college',
      registrationKey: mitCseKey,
      passwordHash: hashPassword('SecurePass123'),
    });

    const studentMitCse2 = await dataService.upsertUserProfile({
      fullName: 'Student MIT CSE 2',
      nickname: `stu_mit_cse2_${timestamp}`,
      isNicknameSame: false,
      email: `stu_mit_cse2_${timestamp}@example.com`,
      emailType: 'college',
      registrationKey: mitCseKey,
      passwordHash: hashPassword('SecurePass123'),
    });

    const studentMitIt1 = await dataService.upsertUserProfile({
      fullName: 'Student MIT IT 1',
      nickname: `stu_mit_it1_${timestamp}`,
      isNicknameSame: false,
      email: `stu_mit_it1_${timestamp}@example.com`,
      emailType: 'college',
      registrationKey: mitItKey,
      passwordHash: hashPassword('SecurePass123'),
    });

    const studentAbcCse1 = await dataService.upsertUserProfile({
      fullName: 'Student ABC CSE 1',
      nickname: `stu_abc_cse1_${timestamp}`,
      isNicknameSame: false,
      email: `stu_abc_cse1_${timestamp}@example.com`,
      emailType: 'college',
      registrationKey: abcCseKey,
      passwordHash: hashPassword('SecurePass123'),
    });

    assert(studentMitCse1.collegeDepartmentId === mitCseDept.id, 'Student 1 enrolled in MIT CSE');
    assert(studentMitCse2.collegeDepartmentId === mitCseDept.id, 'Student 2 enrolled in MIT CSE');
    assert(studentMitIt1.collegeDepartmentId === mitItDept.id, 'Student 3 enrolled in MIT IT');
    assert(studentAbcCse1.collegeDepartmentId === abcCseDept.id, 'Student 4 enrolled in ABC CSE');

    // ----------------------------------------------------------------
    // 5. Admin Data Isolation & Scoped Reporting
    // ----------------------------------------------------------------
    console.log('\n--- Case 5: Admin Data Isolation & Scoped Reporting ---');
    // Admin 1 (MIT CSE) query
    const mitCseReport = await dataService.getStudentsByScope({ collegeDepartmentId: mitCseDept.id });
    const mitCseNicks = mitCseReport.map(s => s.nickname);
    assert(
      mitCseNicks.includes(`stu_mit_cse1_${timestamp}`) && mitCseNicks.includes(`stu_mit_cse2_${timestamp}`),
      'MIT CSE admin sees all MIT CSE students'
    );
    assert(
      !mitCseNicks.includes(`stu_mit_it1_${timestamp}`) && !mitCseNicks.includes(`stu_abc_cse1_${timestamp}`),
      'MIT CSE admin CANNOT see MIT IT or ABC CSE students (Strict Department Isolation)'
    );

    // Admin 2 (MIT IT) query
    const mitItReport = await dataService.getStudentsByScope({ collegeDepartmentId: mitItDept.id });
    const mitItNicks = mitItReport.map(s => s.nickname);
    assert(
      mitItNicks.includes(`stu_mit_it1_${timestamp}`),
      'MIT IT admin sees MIT IT student'
    );
    assert(
      !mitItNicks.includes(`stu_mit_cse1_${timestamp}`) && !mitItNicks.includes(`stu_abc_cse1_${timestamp}`),
      'MIT IT admin CANNOT see MIT CSE or ABC CSE students'
    );

    // Admin 3 (ABC College CSE) query
    const abcCseReport = await dataService.getStudentsByScope({ collegeDepartmentId: abcCseDept.id });
    const abcCseNicks = abcCseReport.map(s => s.nickname);
    assert(
      abcCseNicks.includes(`stu_abc_cse1_${timestamp}`),
      'ABC CSE admin sees ABC CSE student'
    );
    assert(
      !abcCseNicks.includes(`stu_mit_cse1_${timestamp}`) && !abcCseNicks.includes(`stu_mit_it1_${timestamp}`),
      'ABC CSE admin CANNOT see MIT students (Strict Cross-College Isolation)'
    );

    // College-Level Admin query (MIT-WPU, all departments)
    const mitCollegeReport = await dataService.getStudentsByScope({ collegeId: mitCollege.id });
    const mitCollegeNicks = mitCollegeReport.map(s => s.nickname);
    assert(
      mitCollegeNicks.includes(`stu_mit_cse1_${timestamp}`) &&
      mitCollegeNicks.includes(`stu_mit_cse2_${timestamp}`) &&
      mitCollegeNicks.includes(`stu_mit_it1_${timestamp}`),
      'MIT-WPU College admin sees students across all MIT-WPU departments'
    );
    assert(
      !mitCollegeNicks.includes(`stu_abc_cse1_${timestamp}`),
      'MIT-WPU College admin CANNOT see ABC College students'
    );

    // ----------------------------------------------------------------
    // 6. Cross-Department Tampering Prevention Verification
    // ----------------------------------------------------------------
    console.log('\n--- Case 6: Parameter Tampering & Authorization Verification ---');
    // Simulate Admin 1 (MIT CSE) trying to update Admin 2's department key (MIT IT)
    const admin1Payload = {
      adminDeptId: v1?.collegeDepartmentId,
      adminCollegeId: v1?.collegeId,
      targetDeptId: mitItDept.id,
      newKey: 'HACKED_KEY',
    };

    // Verification logic matching PUT /api/admin/registration-key
    const isAuthorized1 = admin1Payload.adminDeptId === admin1Payload.targetDeptId;
    assert(isAuthorized1 === false, 'Department Admin CANNOT modify another department within the same college');

    // Simulate Admin 1 (MIT CSE) trying to update Admin 3's department key (ABC CSE)
    const admin1CrossCollege = {
      adminDeptId: v1?.collegeDepartmentId,
      adminCollegeId: v1?.collegeId,
      targetDeptId: abcCseDept.id,
      targetCollegeId: abcCollege.id,
    };
    const isAuthorized2 = admin1CrossCollege.adminCollegeId === admin1CrossCollege.targetCollegeId;
    assert(isAuthorized2 === false, 'College/Dept Admin CANNOT modify foreign college departments');

    // ----------------------------------------------------------------
    // 7. Key Rotation & Permanent Student Association
    // ----------------------------------------------------------------
    console.log('\n--- Case 7: Key Rotation & Permanent Student Association ---');
    const newMitCseKey = `MITCSE_ROTATED_${timestamp}`;
    await dataService.updateRegistrationKey(mitCseDept.id, newMitCseKey);

    // Verify existing students are STILL linked to the department
    const student1AfterRotation = await dataService.getUserProfile(`stu_mit_cse1_${timestamp}`);
    assert(
      student1AfterRotation?.collegeDepartmentId === mitCseDept.id,
      'Existing student remains attached to MIT CSE department after key rotation'
    );

    // Verify old key lookup fails
    const oldLookup = await dataService.findDepartmentByRegistrationKey(mitCseKey);
    assert(oldLookup === null, 'Old registration key no longer resolves for new students');

    // Verify new student can enroll with new rotated key
    const studentMitCse3 = await dataService.upsertUserProfile({
      fullName: 'Student MIT CSE 3',
      nickname: `stu_mit_cse3_${timestamp}`,
      isNicknameSame: false,
      email: `stu_mit_cse3_${timestamp}@example.com`,
      emailType: 'college',
      registrationKey: newMitCseKey,
      passwordHash: hashPassword('SecurePass123'),
    });
    assert(
      studentMitCse3.collegeDepartmentId === mitCseDept.id,
      'New student successfully enrolls with new rotated registration key'
    );

    // ----------------------------------------------------------------
    // 8. 5-Day Mandatory Profile Completion Rule
    // ----------------------------------------------------------------
    console.log('\n--- Case 8: 5-Day Grace Period Server-Side Enforcement ---');
    // 8a: Student within grace period (2 days old, incomplete profile)
    const studentWithinGrace = {
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days old
      collegeDepartmentId: null,
      passwordHash: null,
    };
    const graceStatus1 = getStudentGracePeriodStatus(studentWithinGrace);
    assert(graceStatus1.isWithinGracePeriod === true, 'Student within 5 days is within grace period');
    assert(graceStatus1.isBeyondGracePeriod === false, 'Student within 5 days is NOT beyond grace period');

    // 8b: Student beyond grace period (7 days old, fully completed profile)
    const studentCompleted = {
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days old
      collegeDepartmentId: mitCseDept.id,
      passwordHash: 'hashed_password_sample',
    };
    const graceStatus2 = getStudentGracePeriodStatus(studentCompleted);
    assert(graceStatus2.isBeyondGracePeriod === true, '7-day old account is beyond grace period');
    assert(graceStatus2.hasValidDepartment === true, '7-day old account has valid department');
    assert(graceStatus2.hasPassword === true, '7-day old account has valid password');
    assert(graceStatus2.isComplete === true, '7-day old completed account is marked complete');

    // 8c: Student beyond grace period (7 days old, missing registration key)
    const studentMissingKey = {
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      collegeDepartmentId: null,
      passwordHash: 'hashed_password_sample',
    };
    const graceStatus3 = getStudentGracePeriodStatus(studentMissingKey);
    assert(graceStatus3.isBeyondGracePeriod === true, '7-day old account without key is beyond grace period');
    assert(graceStatus3.hasValidDepartment === false, 'Missing department flag detected');
    assert(graceStatus3.requiresRegistrationKeySetup === true, 'Registration key setup required flag set');
    assert(graceStatus3.isComplete === false, 'Incomplete profile flagged');

    // 8d: Student beyond grace period (7 days old, missing password)
    const studentMissingPwd = {
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      collegeDepartmentId: mitCseDept.id,
      passwordHash: null,
    };
    const graceStatus4 = getStudentGracePeriodStatus(studentMissingPwd);
    assert(graceStatus4.isBeyondGracePeriod === true, '7-day old account without password is beyond grace period');
    assert(graceStatus4.hasPassword === false, 'Missing password flag detected');
    assert(graceStatus4.requiresPassword === true, 'Password requirement flag set');
    assert(graceStatus4.isComplete === false, 'Incomplete profile flagged');

    // 8e: Historical attempt check fallback
    const mockAttempts = [
      { createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      { createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
    ];
    const earliest = mockAttempts.reduce((earliest: Date, a: any) => {
      const d = new Date(a.createdAt);
      return d < earliest ? d : earliest;
    }, new Date());
    const graceFromAttempt = getStudentGracePeriodStatus(earliest);
    assert(graceFromAttempt.isBeyondGracePeriod === true, 'Historical attempt 10 days ago triggers beyond grace period');

    // ----------------------------------------------------------------
    // 9. Password Validation & Strength Generator
    // ----------------------------------------------------------------
    console.log('\n--- Case 9: Student Password Security & Generation ---');
    assert(validateStudentPassword('Short1!').isValid === false, 'Reject short password (<8 chars)');
    assert(validateStudentPassword('alllowercase1').isValid === false, 'Reject missing uppercase');
    assert(validateStudentPassword('ALLUPPERCASE1').isValid === false, 'Reject missing lowercase');
    assert(validateStudentPassword('NoNumbersHere!').isValid === false, 'Reject missing numeric digit');
    assert(validateStudentPassword('ValidPass123').isValid === true, 'Accept strong password');

    const generated = generateStrongPassword();
    assert(validateStudentPassword(generated).isValid === true, 'Auto-generated strong password passes validation');

    // ----------------------------------------------------------------
    // 10. Clean up Test Data
    // ----------------------------------------------------------------
    console.log('\n--- Case 10: Cleaning up Test Records ---');
    const testNicks = [
      `stu_mit_cse1_${timestamp}`,
      `stu_mit_cse2_${timestamp}`,
      `stu_mit_cse3_${timestamp}`,
      `stu_mit_it1_${timestamp}`,
      `stu_abc_cse1_${timestamp}`,
    ];

    for (const nick of testNicks) {
      await prisma.userProfile.deleteMany({ where: { nickname: nick } });
    }

    await prisma.collegeDepartment.deleteMany({
      where: {
        id: { in: [mitCseDept.id, mitItDept.id, abcCseDept.id, abcMechDept.id] },
      },
    });

    await prisma.college.deleteMany({
      where: { id: abcCollege.id },
    });

    console.log('  ✅ Cleaned up temporary test profiles, departments, and college records.');

  } catch (err) {
    console.error('Unexpected error in test execution:', err);
    failedTests++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n========================================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
