const { MongoClient, ObjectId } = require('mongodb');
const { hash } = require('bcryptjs');

async function setupHodUsers() {
  try {
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db();

    // First get department IDs
    const departments = await db.collection('departments').find({}).toArray();
    const deptMap = {};
    for (const dept of departments) {
      deptMap[dept.abbreviation] = dept._id;
    }

    // HOD data from s.txt
    const hods = [
      { name: 'Mrs. Bhosale S. S.', email: 'bhosale@gmail.com', password: 'bhosale', department: 'CO' },
      { name: 'Mrs. Raut D. A', email: 'raut@gmail.com', password: 'raut', department: 'EE' },
      { name: 'Mr. Hajare  S. K.', email: 'hajare@gmail.com', password: 'hajare', department: 'CE' },
      { name: 'Mr. Pawar  A. N.', email: 'pawar@gmail.com', password: 'pawar', department: 'ME' }
    ];

    console.log('Setting up HOD users...');

    for (const hod of hods) {
      // Create user
      const hashedPassword = await hash(hod.password, 12);
      const userResult = await db.collection('users').insertOne({
        email: hod.email,
        password: hashedPassword,
        role: 'HOD',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Create staff profile
      await db.collection('staff').insertOne({
        userId: userResult.insertedId,
        name: hod.name,
        email: hod.email,
        departmentId: deptMap[hod.department],
        role: 'HOD',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`Created HOD: ${hod.name} for ${hod.department}`);
    }

    // Verify setup
    console.log('\nVerifying setup...');
    
    const users = await db.collection('users').find({ role: 'HOD' }).toArray();
    console.log(`\nHOD Users (${users.length}):`);
    for (const user of users) {
      const staff = await db.collection('staff').findOne({ userId: user._id });
      const dept = await db.collection('departments').findOne({ _id: staff?.departmentId });
      console.log(`${user.email} -> ${dept?.name || 'No department'}`);
    }

    await client.close();
    console.log('\nSetup completed successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setupHodUsers();