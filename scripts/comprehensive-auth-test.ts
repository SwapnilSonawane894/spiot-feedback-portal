import bcrypt from 'bcrypt';
import { userService, COLLECTIONS } from '../src/lib/firebase-services';
import { firestore } from '../src/lib/firebase';

async function comprehensiveAuthTest() {
  console.log('🔐 COMPREHENSIVE AUTHENTICATION TEST\n');
  console.log('=' .repeat(60));
  console.log('\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: [] as Array<{ name: string; status: string; details?: string }>
  };

  // TEST 1: Database State
  console.log('TEST 1: Database State Verification\n');
  console.log('-'.repeat(60));
  
  try {
    const userCount = await userService.count();
    const test1 = userCount === 1;
    results.tests.push({
      name: 'Only 1 user exists in database',
      status: test1 ? '✅ PASS' : '❌ FAIL',
      details: `Found ${userCount} users`
    });
    test1 ? results.passed++ : results.failed++;
    console.log(`${test1 ? '✅' : '❌'} Users in database: ${userCount} (expected: 1)\n`);
  } catch (error) {
    results.tests.push({ name: 'Database user count', status: '❌ FAIL', details: String(error) });
    results.failed++;
    console.log('❌ Failed to check user count\n');
  }

  // TEST 2: Admin User Properties
  console.log('TEST 2: Admin User Properties\n');
  console.log('-'.repeat(60));
  
  try {
    const admin = await userService.findUnique({ email: 'admin@gmail.com' });
    
    if (!admin) {
      results.tests.push({ name: 'Admin user exists', status: '❌ FAIL' });
      results.failed++;
      console.log('❌ Admin user not found\n');
    } else {
      // Check each property
      const propertyTests = [
        { name: 'Email', value: admin.email, expected: 'admin@gmail.com' },
        { name: 'Name', value: admin.name, expected: 'Administrator' },
        { name: 'Role', value: admin.role, expected: 'ADMIN' },
        { name: 'Has ID', value: !!admin.id, expected: true },
        { name: 'Has hashed password', value: !!admin.hashedPassword, expected: true },
      ];

      for (const test of propertyTests) {
        const passed = test.value === test.expected;
        results.tests.push({
          name: `Admin ${test.name}`,
          status: passed ? '✅ PASS' : '❌ FAIL',
          details: `${test.value} ${passed ? '===' : '!=='} ${test.expected}`
        });
        passed ? results.passed++ : results.failed++;
        console.log(`${passed ? '✅' : '❌'} ${test.name}: ${test.value}`);
      }
      console.log('');
    }
  } catch (error) {
    results.tests.push({ name: 'Admin user fetch', status: '❌ FAIL', details: String(error) });
    results.failed++;
    console.log(`❌ Failed to fetch admin user: ${error}\n`);
  }

  // TEST 3: Password Verification
  console.log('TEST 3: Password Verification\n');
  console.log('-'.repeat(60));
  
  try {
    const admin = await userService.findUnique({ email: 'admin@gmail.com' });
    
    if (admin) {
      // Test correct password
      const correctPassword = await bcrypt.compare('123', admin.hashedPassword);
      results.tests.push({
        name: 'Correct password ("123") verification',
        status: correctPassword ? '✅ PASS' : '❌ FAIL'
      });
      correctPassword ? results.passed++ : results.failed++;
      console.log(`${correctPassword ? '✅' : '❌'} Correct password accepts: ${correctPassword}`);

      // Test wrong passwords
      const wrongPasswords = ['wrong', 'admin', '1234', 'password'];
      for (const wrongPwd of wrongPasswords) {
        const wrongPassword = await bcrypt.compare(wrongPwd, admin.hashedPassword);
        const passed = !wrongPassword; // Should be false
        results.tests.push({
          name: `Wrong password "${wrongPwd}" rejection`,
          status: passed ? '✅ PASS' : '❌ FAIL'
        });
        passed ? results.passed++ : results.failed++;
        console.log(`${passed ? '✅' : '❌'} Wrong password "${wrongPwd}" rejects: ${!wrongPassword}`);
      }
      console.log('');
    }
  } catch (error) {
    results.tests.push({ name: 'Password verification', status: '❌ FAIL', details: String(error) });
    results.failed++;
    console.log(`❌ Password verification failed: ${error}\n`);
  }

  // TEST 4: Firebase Collections Status
  console.log('TEST 4: Firebase Collections Status\n');
  console.log('-'.repeat(60));
  
  const collections = [
    COLLECTIONS.USERS,
    COLLECTIONS.DEPARTMENTS,
    COLLECTIONS.STAFF,
    COLLECTIONS.ACADEMIC_YEARS,
    COLLECTIONS.SUBJECTS,
    COLLECTIONS.FACULTY_ASSIGNMENTS,
    COLLECTIONS.FEEDBACK,
    COLLECTIONS.HOD_SUGGESTIONS,
  ];

  for (const collectionName of collections) {
    try {
      const snapshot = await firestore.collection(collectionName).get();
      const count = snapshot.size;
      const expectedEmpty = collectionName !== COLLECTIONS.USERS;
      const passed = expectedEmpty ? count === 0 : count === 1;
      
      results.tests.push({
        name: `Collection ${collectionName}`,
        status: passed ? '✅ PASS' : '⚠️  WARN',
        details: `${count} documents (expected: ${expectedEmpty ? '0' : '1'})`
      });
      passed ? results.passed++ : results.failed++;
      
      console.log(`${passed ? '✅' : '⚠️ '} ${collectionName}: ${count} documents`);
    } catch (error) {
      console.log(`❌ ${collectionName}: Error - ${error}`);
    }
  }
  console.log('');

  // TEST 5: Session Simulation
  console.log('TEST 5: Session Simulation (NextAuth Flow)\n');
  console.log('-'.repeat(60));
  
  try {
    // Simulate the NextAuth authorize function
    const credentials = { email: 'admin@gmail.com', password: '123' };
    
    // Step 1: Find user
    const user = await userService.findUnique({ email: credentials.email });
    const userFound = !!user;
    results.tests.push({
      name: 'NextAuth: User lookup',
      status: userFound ? '✅ PASS' : '❌ FAIL'
    });
    userFound ? results.passed++ : results.failed++;
    console.log(`${userFound ? '✅' : '❌'} User lookup: ${userFound}`);

    if (user && user.hashedPassword) {
      // Step 2: Verify password
      const isCorrectPassword = await bcrypt.compare(credentials.password, user.hashedPassword);
      results.tests.push({
        name: 'NextAuth: Password verification',
        status: isCorrectPassword ? '✅ PASS' : '❌ FAIL'
      });
      isCorrectPassword ? results.passed++ : results.failed++;
      console.log(`${isCorrectPassword ? '✅' : '❌'} Password verification: ${isCorrectPassword}`);

      // Step 3: Simulate session creation
      if (isCorrectPassword) {
        const sessionUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
        const sessionValid = !!(sessionUser.id && sessionUser.email && sessionUser.role);
        results.tests.push({
          name: 'NextAuth: Session creation',
          status: sessionValid ? '✅ PASS' : '❌ FAIL'
        });
        sessionValid ? results.passed++ : results.failed++;
        console.log(`${sessionValid ? '✅' : '❌'} Session creation: ${sessionValid}`);
        console.log(`   Session data: ${JSON.stringify(sessionUser, null, 2)}`);
      }
    }
    console.log('');
  } catch (error) {
    results.tests.push({ name: 'Session simulation', status: '❌ FAIL', details: String(error) });
    results.failed++;
    console.log(`❌ Session simulation failed: ${error}\n`);
  }

  // SUMMARY
  console.log('=' .repeat(60));
  console.log('\n📊 TEST SUMMARY\n');
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%\n`);

  console.log('📋 Detailed Results:\n');
  results.tests.forEach((test, index) => {
    console.log(`${index + 1}. ${test.status} - ${test.name}`);
    if (test.details) {
      console.log(`   ${test.details}`);
    }
  });

  console.log('\n' + '=' .repeat(60));
  
  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Authentication is working correctly.\n');
    console.log('✅ You can login with:');
    console.log('   Email:    admin@gmail.com');
    console.log('   Password: 123\n');
    return true;
  } else {
    console.log(`\n⚠️  ${results.failed} test(s) failed. Please review above.\n`);
    return false;
  }
}

comprehensiveAuthTest()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
