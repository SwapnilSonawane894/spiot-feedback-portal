import fetch from 'node-fetch';

const baseUrl = 'http://localhost:5000';

async function testLogin(email, password, expectedRole) {
  console.log(`\n========================================`);
  console.log(`Testing login: ${email}`);
  console.log(`Expected role: ${expectedRole}`);
  console.log(`========================================`);

  try {
    // Get CSRF token first
    const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    
    console.log('✓ Got CSRF token');

    // Attempt login
    const loginRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: email,
        password: password,
        csrfToken: csrfToken,
        callbackUrl: `${baseUrl}/`,
        json: 'true'
      }),
      redirect: 'manual'
    });

    console.log(`Login response status: ${loginRes.status}`);
    
    if (loginRes.status === 200) {
      const data = await loginRes.json();
      console.log('✅ LOGIN SUCCESSFUL');
      console.log(`   Response:`, data);
      
      // Get the cookies
      const cookies = loginRes.headers.get('set-cookie');
      if (cookies) {
        console.log('✓ Session cookie set');
        
        // Test session endpoint
        const sessionRes = await fetch(`${baseUrl}/api/auth/session`, {
          headers: {
            'Cookie': cookies
          }
        });
        
        if (sessionRes.ok) {
          const session = await sessionRes.json();
          console.log('✓ Session retrieved successfully');
          console.log(`   User role: ${session?.user?.role}`);
          console.log(`   User email: ${session?.user?.email}`);
          
          if (session?.user?.role === expectedRole) {
            console.log('✅ Role matches expected!');
          } else {
            console.log(`❌ Role mismatch! Expected ${expectedRole}, got ${session?.user?.role}`);
          }
        }
      }
    } else if (loginRes.status === 401) {
      console.log('❌ LOGIN FAILED - Invalid credentials');
      const text = await loginRes.text();
      console.log('   Response:', text);
    } else {
      console.log(`❌ Unexpected status: ${loginRes.status}`);
      const text = await loginRes.text();
      console.log('   Response:', text);
    }

  } catch (error) {
    console.error('❌ Error during login test:', error.message);
  }
}

async function runTests() {
  console.log('\n🔐 Testing Login Flow for All Roles\n');
  
  await testLogin('admin@gmail.com', '123', 'ADMIN');
  await testLogin('kharat@gmail.com', 'kharat', 'HOD');
  await testLogin('bhosale@gmail.com', 'bhosale', 'FACULTY');
  
  console.log('\n✅ All login tests completed!\n');
}

runTests();
