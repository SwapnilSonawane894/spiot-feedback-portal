const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const CO_DEPT_ID = '68f6390b641c7bcb2781b39c';

// Student IDs from screenshots
const TYCO_STUDENT_ID = '68f86526f16d44023c9ba5bb'; // Swapnil (23213070142)
const SYCO_STUDENT_ID = '68f864d3f16d44023c9ba50c'; // Choudhari (roll from earlier)

async function debugStudentTasks() {
  const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('feedback');
    const users = db.collection('users');
    const facultyAssignments = db.collection('facultyAssignments');
    
    // Get student details
    console.log('🔍 TYCO Student (Swapnil):');
    const tycoStudent = await users.findOne({ _id: new ObjectId(TYCO_STUDENT_ID) });
    console.log(`  academicYearId: ${tycoStudent?.academicYearId}`);
    console.log(`  departmentId: ${tycoStudent?.departmentId}`);
    console.log(`  semester: ${tycoStudent?.semester}\n`);
    
    console.log('🔍 SYCO Student (Choudhari):');
    const sycoStudent = await users.findOne({ _id: new ObjectId(SYCO_STUDENT_ID) });
    console.log(`  academicYearId: ${sycoStudent?.academicYearId}`);
    console.log(`  departmentId: ${sycoStudent?.departmentId}`);
    console.log(`  semester: ${sycoStudent?.semester}\n`);
    
    // Check faculty assignments for TYCO
    console.log('📊 Faculty assignments for TYCO academicYearId:');
    const tycoAssignments = await facultyAssignments.find({
      departmentId: CO_DEPT_ID,
      academicYearId: tycoStudent?.academicYearId
    }).toArray();
    console.log(`  Found: ${tycoAssignments.length} assignments`);
    console.log(`  Sample IDs: ${tycoAssignments.slice(0, 3).map(a => a._id).join(', ')}\n`);
    
    // Check faculty assignments for SYCO
    console.log('📊 Faculty assignments for SYCO academicYearId:');
    const sycoAssignments = await facultyAssignments.find({
      departmentId: CO_DEPT_ID,
      academicYearId: sycoStudent?.academicYearId
    }).toArray();
    console.log(`  Found: ${sycoAssignments.length} assignments`);
    console.log(`  Sample IDs: ${sycoAssignments.slice(0, 3).map(a => a._id).join(', ')}\n`);
    
    // Show all CO faculty assignments grouped by academicYearId
    console.log('📊 ALL CO faculty assignments grouped:');
    const allCO = await facultyAssignments.find({ departmentId: CO_DEPT_ID }).toArray();
    const grouped = {};
    allCO.forEach(a => {
      const yearId = a.academicYearId || 'NULL';
      if (!grouped[yearId]) grouped[yearId] = 0;
      grouped[yearId]++;
    });
    Object.keys(grouped).forEach(yearId => {
      console.log(`  ${yearId}: ${grouped[yearId]} assignments`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

debugStudentTasks();
