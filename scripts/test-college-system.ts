import { db as prisma } from '../src/lib/db';
import { dataService } from '../src/lib/dataService';
import {
  normalizeCollegeName,
  isCollegeNameMatch,
  isDummyCollege,
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
  console.log('\n======================================================');
  console.log('🧪 RUNNING COLLEGE MANAGEMENT SYSTEM VERIFICATION SUITE');
  console.log('======================================================\n');

  try {
    // ----------------------------------------------------------------
    // 1. Normalization & Matching Logic
    // ----------------------------------------------------------------
    console.log('--- Case 1: College Name Normalization ---');
    const norm1 = normalizeCollegeName('  MIT   -   WPU  University  Pune.  ');
    assert(norm1 === 'MIT - WPU University Pune', 'Whitespace and trailing punctuation stripping', `Got: "${norm1}"`);

    const norm2 = normalizeCollegeName('College of Engineering, Pune');
    assert(norm2 === 'College of Engineering, Pune', 'Punctuation within name preserved', `Got: "${norm2}"`);

    // ----------------------------------------------------------------
    // 2. Exact Normalized College Matching
    // ----------------------------------------------------------------
    console.log('\n--- Case 2: Exact Normalized Matching ---');
    assert(
      isCollegeNameMatch('mit - wpu university pune', 'MIT - WPU University Pune'),
      'Case-insensitive match'
    );
    assert(
      isCollegeNameMatch('  MIT  -  WPU   University   Pune. ', 'MIT - WPU University Pune'),
      'Spacing/punctuation variance match'
    );
    assert(
      !isCollegeNameMatch('MIT University', 'MIT - WPU University Pune'),
      'Partial name correctly rejected'
    );
    assert(
      !isCollegeNameMatch('Random College XYZ', 'MIT - WPU University Pune'),
      'Unconfigured college name rejected'
    );

    // ----------------------------------------------------------------
    // 3. Dummy College Detection
    // ----------------------------------------------------------------
    console.log('\n--- Case 3: Dummy College Recognition ---');
    assert(isDummyCollege('Enter-your-college'), 'Enter-your-college recognized as dummy');
    assert(isDummyCollege('enter-your-college'), 'Case-insensitive enter-your-college is dummy');
    assert(isDummyCollege(' Enter your college '), 'Spaced Enter your college is dummy');
    assert(!isDummyCollege('MIT - WPU University Pune'), 'Real college is not dummy');

    // ----------------------------------------------------------------
    // 4. 5-Day Grace Period Calculation
    // ----------------------------------------------------------------
    console.log('\n--- Case 4: 5-Day Grace Period Status ---');
    const freshStudent = {
      createdAt: new Date(),
      collegeId: 1,
      college: { id: 1, name: 'Enter-your-college', identifier: 'DUMMY' },
      passwordHash: null,
    };
    const grace1 = getStudentGracePeriodStatus(freshStudent);
    assert(grace1.isWithinGracePeriod === true, 'New student is within grace period');
    assert(grace1.requiresCollegeSetup === false, 'New student with dummy college does not yet require setup');
    assert(grace1.daysRemaining >= 4 && grace1.daysRemaining <= 5, 'Days remaining calculated accurately (4-5 days)');

    const expiredDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000); // 6 days ago
    const expiredStudent = {
      createdAt: expiredDate,
      collegeId: 1,
      college: { id: 1, name: 'Enter-your-college', identifier: 'DUMMY' },
      passwordHash: null,
    };
    const graceExpired = getStudentGracePeriodStatus(expiredStudent);
    assert(graceExpired.isWithinGracePeriod === false, 'Student created 6 days ago is NOT within grace period');
    assert(graceExpired.requiresCollegeSetup === true, 'Expired student requires college setup');
    assert(graceExpired.daysRemaining === 0, 'Days remaining is 0');

    // ----------------------------------------------------------------
    // 5. Student Password Policy Validation
    // ----------------------------------------------------------------
    console.log('\n--- Case 5: Password Policy Enforcement ---');
    assert(validateStudentPassword('Password123').isValid === true, 'Valid password accepted (upper, lower, num, 8+ chars)');
    assert(validateStudentPassword('short1A').isValid === false, 'Short password (<8 chars) rejected');
    assert(validateStudentPassword('alllowercase1').isValid === false, 'Missing uppercase rejected');
    assert(validateStudentPassword('ALLUPPERCASE1').isValid === false, 'Missing lowercase rejected');
    assert(validateStudentPassword('NoNumbersPassword').isValid === false, 'Missing number rejected');

    const generated = generateStrongPassword();
    assert(validateStudentPassword(generated).isValid === true, 'Auto-generated strong password passes validation');

    // ----------------------------------------------------------------
    // 6. Super Admin College CRUD
    // ----------------------------------------------------------------
    console.log('\n--- Case 6: Super Admin College Configuration CRUD ---');
    const testCollegeIdentifier = `TEST_COL_${Date.now()}`;
    const testCollegeName = `Test Institute of Technology ${Date.now()}`;

    // Create
    const createdCollege = await dataService.createCollege({
      name: testCollegeName,
      identifier: testCollegeIdentifier,
    });
    assert(createdCollege.id > 0, 'Super Admin creates college successfully');
    assert(createdCollege.identifier === testCollegeIdentifier.toUpperCase(), 'College identifier stored in uppercase');

    // Normalized search
    const foundByName = await dataService.findCollegeByName(`  ${testCollegeName.toLowerCase()} . `);
    assert(foundByName !== null && foundByName.id === createdCollege.id, 'Normalized college lookup finds newly created college');

    // Update
    const updatedCollege = await dataService.updateCollege(createdCollege.id, {
      name: `${testCollegeName} Updated`,
    });
    assert(updatedCollege.name === `${testCollegeName} Updated`, 'Super Admin updates college name');

    // Delete
    const deleted = await dataService.deleteCollege(createdCollege.id);
    assert(deleted === true, 'Super Admin deletes college');

    // ----------------------------------------------------------------
    // 7. Super Admin Admin Creation with College Assignment
    // ----------------------------------------------------------------
    console.log('\n--- Case 7: Super Admin Creates Admin with College ---');
    const dummyCollege = await dataService.getOrCreateDummyCollege();
    const mitCollege = await dataService.findCollegeByName('MIT - WPU University Pune');
    assert(mitCollege !== null, 'Found MIT-WPU college in seeded database');

    if (mitCollege) {
      const testAdminEmail = `test.officer.${Date.now()}@wpu.edu.in`;
      const newAdmin = await dataService.createAdmin({
        email: testAdminEmail,
        name: 'Test Officer',
        passwordHash: hashPassword('TestAdmin@123'),
        collegeId: mitCollege.id,
      });
      assert(newAdmin.collegeId === mitCollege.id, 'Admin successfully created with college association');
      assert(newAdmin.email === testAdminEmail, 'Admin email correctly set');

      // ----------------------------------------------------------------
      // 8. Admin Token Signing & College Scoping
      // ----------------------------------------------------------------
      console.log('\n--- Case 8: Admin Token Scoping & Verification ---');
      const token = signAdminToken({
        id: newAdmin.id,
        email: newAdmin.email,
        name: newAdmin.name,
        collegeId: mitCollege.id,
        collegeName: mitCollege.name,
      });
      assert(typeof token === 'string' && token.length > 20, 'Signed JWT-like admin token');

      const verifiedPayload = verifyAdminToken(token);
      assert(verifiedPayload !== null, 'Admin token verifies successfully');
      assert(verifiedPayload?.collegeId === mitCollege.id, 'Admin token payload contains correct collegeId');
      assert(verifiedPayload?.collegeName === mitCollege.name, 'Admin token payload contains correct collegeName');

      // ----------------------------------------------------------------
      // 9. College Scoped Reporting & Data Isolation
      // ----------------------------------------------------------------
      console.log('\n--- Case 9: College Data Isolation & Scoped Reporting ---');
      const mitStudents = await dataService.getStudentsByCollege(mitCollege.id);
      assert(Array.isArray(mitStudents), 'Retrieved students list for MIT college');
      assert(mitStudents.every(s => s.collegeId === mitCollege.id), 'All returned students belong strictly to MIT-WPU');

      const coepCollege = await dataService.findCollegeByName('College of Engineering Pune');
      if (coepCollege) {
        const coepStudents = await dataService.getStudentsByCollege(coepCollege.id);
        assert(coepStudents.every(s => s.collegeId === coepCollege.id), 'COEP students strictly isolated from MIT');
        // Ensure no cross-college student leakage
        const overlap = mitStudents.filter(m => coepStudents.some(c => c.id === m.id));
        assert(overlap.length === 0, 'Zero student data leakage between colleges');

        // Scoped Stats Isolation
        const mitStats = await dataService.getStatsByCollege(mitCollege.id);
        const coepStats = await dataService.getStatsByCollege(coepCollege.id);
        const globalStats = await dataService.getStatsByCollege(null); // Unrestricted

        assert(mitStats.totalUsers <= globalStats.totalUsers, 'MIT user count is scoped subset of global');
        assert(coepStats.totalUsers <= globalStats.totalUsers, 'COEP user count is scoped subset of global');
      }

      // ----------------------------------------------------------------
      // 10. Student Password Reset by Admin
      // ----------------------------------------------------------------
      const newHash = hashPassword('NewSecurePass@2026');
      const resetResult = await dataService.resetStudentPassword('alex_mit', newHash);
      assert(resetResult !== null, 'Admin resets student password');

      // Verify the updated hash works
      const studentProfile = await prisma.userProfile.findUnique({ where: { nickname: 'alex_mit' } });
      assert(studentProfile?.passwordHash !== null, 'Student profile has non-null passwordHash');
      if (studentProfile?.passwordHash) {
        assert(verifyPassword('NewSecurePass@2026', studentProfile.passwordHash), 'New password verifies against stored hash');
      }

      // Cleanup test admin
      await prisma.adminUser.delete({ where: { id: newAdmin.id } });
    }

    // ----------------------------------------------------------------
    // 11. Super Admin Unrestricted Capabilities
    // ----------------------------------------------------------------
    console.log('\n--- Case 11: Super Admin Authentication & Unrestricted Access ---');
    const superToken = signSuperAdminToken();
    assert(verifySuperAdminToken(superToken) === true, 'Super Admin token verifies');
    const allColleges = await dataService.getAllColleges();
    assert(allColleges.length >= 4, 'Super Admin sees all configured colleges');

    // ----------------------------------------------------------------
    // 12. Password Hashing Security
    // ----------------------------------------------------------------
    console.log('\n--- Case 12: Cryptographic Password Hashing ---');
    const h1 = hashPassword('MySecretPass@123');
    const h2 = hashPassword('MySecretPass@123');
    assert(h1 !== h2, 'Salts are unique per hash');
    assert(verifyPassword('MySecretPass@123', h1), 'Correct password verifies');
    assert(!verifyPassword('WrongPassword', h1), 'Wrong password fails verification');

  } catch (err) {
    console.error('Unexpected error in test execution:', err);
    failedTests++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n======================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
