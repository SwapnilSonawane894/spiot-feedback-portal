const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const CO_DEPT_ID = '68f6390b641c7bcb2781b39c';
const SHARED_CODES = ['315002', '315003', '313002'];

// Academic year mappings
const TYCO_YEAR_ID = '68f63990dc335227e2601fe2';
const SYCO_YEAR_ID = '68f63980dc335227e2601fe1';

async function createJunctions() {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('feedback');
    const subjects = db.collection('subjects');
    const departmentSubjects = db.collection('departmentSubjects');
    
    // Find shared subjects
    const sharedSubjects = await subjects.find({
      subjectCode: { $in: SHARED_CODES }
    }).toArray();
    
    console.log(`📚 Found ${sharedSubjects.length} shared subjects\n`);
    
    if (sharedSubjects.length === 0) {
      console.log('❌ No shared subjects found! Run copy script first.');
      return;
    }
    
    const junctionsToCreate = [];
    
    for (const subject of sharedSubjects) {
      // Determine academic year based on semester
      let academicYearId;
      const sem = typeof subject.semester === 'number' ? subject.semester : parseInt(subject.semester, 10);
      if (sem === 5 || sem === 6) {
        academicYearId = TYCO_YEAR_ID;
      } else if (sem === 3 || sem === 4) {
        academicYearId = SYCO_YEAR_ID;
      } else {
        console.log(`⚠️  Unknown semester ${subject.semester} for ${subject.name}`);
        continue;
      }
      
      // Check if junction already exists
      const existing = await departmentSubjects.findOne({
        subjectId: subject._id.toString(),
        departmentId: CO_DEPT_ID
      });
      
      if (existing) {
        console.log(`✓ Junction exists: ${subject.name} (${subject.subjectCode})`);
        continue;
      }
      
      const junction = {
        _id: new ObjectId(),
        subjectId: subject._id.toString(),
        departmentId: CO_DEPT_ID,
        academicYearId: academicYearId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      junctionsToCreate.push(junction);
      console.log(`➕ Will create: ${subject.name} (${subject.subjectCode}) → ${academicYearId === TYCO_YEAR_ID ? 'TYCO' : 'SYCO'}`);
    }
    
    if (junctionsToCreate.length === 0) {
      console.log('\n✅ All junctions already exist!');
      return;
    }
    
    const result = await departmentSubjects.insertMany(junctionsToCreate);
    console.log(`\n✅ Created ${result.insertedCount} junction entries`);
    
    // Verify
    console.log('\n📊 VERIFICATION:\n');
    const totalCO = await departmentSubjects.countDocuments({
      departmentId: CO_DEPT_ID
    });
    console.log(`Total CO departmentSubjects: ${totalCO} (should be 21)`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.close();
  }
}

createJunctions();
