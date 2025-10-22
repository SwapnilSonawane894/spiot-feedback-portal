import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';

const uri = process.env.MONGODB_URI;

async function createHODUser() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('feedbackPortal');
    
    // Check if user already exists
    const existing = await db.collection('users').findOne({ email: 'kharat@gmail.com' });
    if (existing) {
      console.log('❌ User kharat@gmail.com already exists');
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash('kharat', 10);
    
    // Create user with HOD role
    const userResult = await db.collection('users').insertOne({
      name: 'Dr. Kharat',
      email: 'kharat@gmail.com',
      hashedPassword: hashedPassword,
      role: 'HOD',
      createdAt: new Date()
    });
    
    console.log(`✓ Created HOD user: kharat@gmail.com`);
    console.log(`  User ID: ${userResult.insertedId}`);
    
    // Get first department to assign
    const department = await db.collection('departments').findOne({});
    
    if (department) {
      // Create staff profile
      const staffResult = await db.collection('staff').insertOne({
        userId: userResult.insertedId.toString(),
        departmentId: department._id.toString(),
        employeeId: 'HOD001',
        designation: 'Head of Department',
        createdAt: new Date()
      });
      
      console.log(`✓ Created staff profile`);
      console.log(`  Staff ID: ${staffResult.insertedId}`);
      console.log(`  Assigned to department: ${department.name}`);
    } else {
      console.log('⚠ No departments found to assign');
    }
    
    console.log('\n✅ HOD user created successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

createHODUser();
