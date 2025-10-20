import { getDatabase } from '../src/lib/mongodb';

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...\n');
    
    const db = await getDatabase();
    
    // Get database stats
    const stats = await db.stats();
    console.log('✅ Successfully connected to MongoDB!');
    console.log('Database name:', db.databaseName);
    console.log('Database size:', Math.round(stats.dataSize / 1024), 'KB');
    console.log('Storage size:', Math.round(stats.storageSize / 1024), 'KB');
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\n📦 Collections found:', collections.length);
    collections.forEach(col => console.log('   -', col.name));
    
    // Count documents in key collections
    console.log('\n📊 Document counts:');
    const users = await db.collection('users').countDocuments();
    const staff = await db.collection('staff').countDocuments();
    const departments = await db.collection('departments').countDocuments();
    const students = await db.collection('users').countDocuments({ role: 'STUDENT' });
    const faculty = await db.collection('users').countDocuments({ role: 'FACULTY' });
    
    console.log('   - Total users:', users);
    console.log('   - Students:', students);
    console.log('   - Faculty:', faculty);
    console.log('   - Staff profiles:', staff);
    console.log('   - Departments:', departments);
    
    // Show a sample staff member
    console.log('\n👥 Sample staff member:');
    const sampleStaff = await db.collection('staff').findOne({});
    if (sampleStaff) {
      const user = await db.collection('users').findOne({ _id: sampleStaff.userId });
      const dept = await db.collection('departments').findOne({ _id: sampleStaff.departmentId });
      console.log('   - Name:', user?.name || 'N/A');
      console.log('   - Email:', user?.email || 'N/A');
      console.log('   - Department:', dept?.name || 'N/A');
    }
    
    console.log('\n✅ This is 100% MongoDB - NO Firebase!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testConnection();
