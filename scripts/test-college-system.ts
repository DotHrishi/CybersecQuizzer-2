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
  console.log('🧪 RUNNING REGISTRATION KEY + COLLEGE/DEPARTMENT ARCHITECTURE TEST SUITE');
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
    // 2. Registration Key Resolution to College & Department
    // ----------------------------------------------------------------
    console.log('\n--- Case 2: Registration Key Lookup & Resolution ---');
    const mitCollege = await dataService.findCollegeByName('MIT - WPU University Pune');
    assert(mitCollege !== null, 'Found MIT-WPU college in database');

    if (mitCollege) {
      const dept = await dataService.findDepartmentByRegistrationKey('MITCSE2026');
      assert(dept !== null, 'Found department for registration key MITCSE2026');
      assert(dept?.departmentName === 'Computer Science & Engineering', 'Resolved department is Computer Science');
      assert(dept?.collegeId === mitCollege.id, 'Resolved college is MIT-WPU');

      const notFoundDept = await dataService.findDepartmentByRegistrationKey('INVALID_KEY_999');
      assert(notFoundDept === null, 'Invalid key returns null');
    }

    // ----------------------------------------------------------------
    // 3. Super Admin Department CRUD & Key Uniqueness
    // ----------------------------------------------------------------
    console.log('\n--- Case 3: Super Admin Department CRUD & Key Uniqueness ---');
    if (mitCollege) {
      const uniqueKey = `TESTKEY_${Date.now()}`;
      const createdDept = await dataService.createDepartment({
        collegeId: mitCollege.id,
        departmentName: `Test Dept ${Date.now()}`,
        registrationKey: uniqueKey,
      });

      assert(createdDept.id > 0, 'Created department successfully');
      assert(createdDept.registrationKey === uniqueKey, 'Stored registration key matches input');

      // Attempt to create another department with duplicate key -> should fail
      let duplicateError = false;
      try {
        await dataService.createDepartment({
          collegeId: mitCollege.id,
          departmentName: `Another Dept ${Date.now()}`,
          registrationKey: uniqueKey,
        });
      } catch {
        duplicateError = true;
      }
      assert(duplicateError === true, 'Duplicate registration key rejected by uniqueness constraint');

      // Update Department registration key
      const updatedKey = `${uniqueKey}_UPDATED`;
      const updatedDept = await dataService.updateDepartment(createdDept.id, {
        registrationKey: updatedKey,
      });
      assert(updatedDept.registrationKey === updatedKey, 'Updated department registration key');

      // Delete Department
      const deleted = await dataService.deleteDepartment(createdDept.id);
      assert(deleted === true, 'Deleted department');
    }

    // ----------------------------------------------------------------
    // 4. Student Registration with Registration Key
    // ----------------------------------------------------------------
    console.log('\n--- Case 4: Student Registration via Authoritative Registration Key ---');
    const testStudentNick = `test_student_${Date.now()}`;
    const registeredStudent = await dataService.upsertUserProfile({
      fullName: 'New Department Student',
      nickname: testStudentNick,
      isNicknameSame: false,
      email: `${testStudentNick}@example.com`,
      emailType: 'college',
      registrationKey: 'MITCSE2026',
      passwordHash: hashPassword('SecurePassword123'),
    });

    assert(registeredStudent.collegeDepartmentId !== null, 'Student associated with collegeDepartmentId');
    assert(registeredStudent.collegeDepartment?.departmentName === 'Computer Science & Engineering', 'Student department resolved as Computer Science');
    assert(
      (registeredStudent.collegeDepartment?.college?.name || registeredStudent.college?.name) === 'MIT - WPU University Pune',
      'Student college resolved as MIT-WPU'
    );

    // ----------------------------------------------------------------
    // 5. Registration Key Rotation & Permanent Student Association
    // ----------------------------------------------------------------
    console.log('\n--- Case 5: Key Rotation & Permanent Student Association ---');
    // Fetch department
    const csDept = await dataService.findDepartmentByRegistrationKey('MITCSE2026');
    assert(csDept !== null, 'Found CSE department');

    if (csDept) {
      const studentBeforeRotation = await dataService.getUserProfile(testStudentNick);
      const originalDeptId = studentBeforeRotation?.collegeDepartmentId;

      // Rotate key to MITCSE2027
      const rotated = await dataService.updateRegistrationKey(csDept.id, 'MITCSE2027');
      assert(rotated.registrationKey === 'MITCSE2027', 'Registration key rotated to MITCSE2027');

      // Check existing student: Department relationship MUST REMAIN UNCHANGED
      const studentAfterRotation = await dataService.getUserProfile(testStudentNick);
      assert(
        studentAfterRotation?.collegeDepartmentId === originalDeptId,
        'Existing student collegeDepartmentId remains intact after key rotation'
      );
      assert(
        studentAfterRotation?.collegeDepartment?.departmentName === 'Computer Science & Engineering',
        'Existing student departmentName remains unchanged'
      );

      // Verify old key MITCSE2026 is no longer valid for new registrations
      const oldKeyLookup = await dataService.findDepartmentByRegistrationKey('MITCSE2026');
      assert(oldKeyLookup === null, 'Old registration key is deactivated for new lookups');

      // Verify new key MITCSE2027 is valid for new registrations
      const newKeyLookup = await dataService.findDepartmentByRegistrationKey('MITCSE2027');
      assert(newKeyLookup !== null && newKeyLookup.id === csDept.id, 'New registration key resolves correctly');

      // Restore key back to MITCSE2026 for consistency
      await dataService.updateRegistrationKey(csDept.id, 'MITCSE2026');
    }

    // ----------------------------------------------------------------
    // 6. Department Scoped Reporting & Data Isolation
    // ----------------------------------------------------------------
    console.log('\n--- Case 6: Department Scoped Queries & Isolation ---');
    const mitDept = await dataService.findDepartmentByRegistrationKey('MITCSE2026');
    const coepDept = await dataService.findDepartmentByRegistrationKey('COEPCSE');

    if (mitDept && coepDept) {
      // Department-level query
      const mitDeptStudents = await dataService.getStudentsByScope({ collegeDepartmentId: mitDept.id });
      assert(
        mitDeptStudents.every(s => s.collegeDepartmentId === mitDept.id),
        'Department admin queries return ONLY students enrolled in that specific department'
      );

      const coepDeptStudents = await dataService.getStudentsByScope({ collegeDepartmentId: coepDept.id });
      assert(
        coepDeptStudents.every(s => s.collegeDepartmentId === coepDept.id),
        'COEP department students strictly isolated from MIT department'
      );

      // College-level query (contains all departments under that college)
      const mitCollegeStudents = await dataService.getStudentsByScope({ collegeId: mitDept.collegeId });
      assert(
        mitCollegeStudents.some(s => s.nickname === 'alex_mit'),
        'College-level query includes students from all departments within that college'
      );

      // Global query (Super Admin)
      const allStudents = await dataService.getStudentsByScope({});
      assert(
        allStudents.length >= mitDeptStudents.length + coepDeptStudents.length,
        'Global super admin query includes all students across all institutions'
      );
    }

    // ----------------------------------------------------------------
    // 7. Admin Token Department Scoping
    // ----------------------------------------------------------------
    console.log('\n--- Case 7: Admin Token Department Scoping ---');
    if (mitDept) {
      const token = signAdminToken({
        id: 999,
        email: 'admin.cse@wpu.edu.in',
        name: 'CSE Admin',
        collegeId: mitDept.collegeId,
        collegeName: 'MIT - WPU University Pune',
        collegeDepartmentId: mitDept.id,
        departmentName: 'Computer Science & Engineering',
      });

      const verified = verifyAdminToken(token);
      assert(verified?.collegeDepartmentId === mitDept.id, 'Admin token carries collegeDepartmentId');
      assert(verified?.departmentName === 'Computer Science & Engineering', 'Admin token carries departmentName');
    }

    // ----------------------------------------------------------------
    // 8. 5-Day Grace Period Enforcement
    // ----------------------------------------------------------------
    console.log('\n--- Case 8: Grace Period Status ---');
    const freshStudent = {
      createdAt: new Date(),
      collegeDepartmentId: null,
      passwordHash: null,
    };
    const graceStatus = getStudentGracePeriodStatus(freshStudent);
    assert(graceStatus.isWithinGracePeriod === true, 'Fresh student is within 5-day grace period');
    assert(graceStatus.isBeyondGracePeriod === false, 'Fresh student not beyond grace period');
    assert(graceStatus.requiresRegistrationKeySetup === false, 'Fresh student does not yet require key setup');

    const expiredStudent = {
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      collegeDepartmentId: null,
      passwordHash: null,
    };
    const expiredStatus = getStudentGracePeriodStatus(expiredStudent);
    assert(expiredStatus.isBeyondGracePeriod === true, 'Student created 6 days ago is beyond grace period');
    assert(expiredStatus.requiresRegistrationKeySetup === true, 'Expired student requires registration key setup');

    // Clean up test student
    await prisma.userProfile.delete({ where: { nickname: testStudentNick } });

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
