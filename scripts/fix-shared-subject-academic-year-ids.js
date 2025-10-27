const { MongoClient, ObjectId } = require('mongodb');

// IMPORTANT: set MONGO_URI environment variable before running the script
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://swapnilsonawane:PASSWORDHERE@feedback.zqekn.mongodb.net/feedback?retryWrites=true&w=majority&appName=Feedback';

// CO Department Academic Year IDs (target correct mapping)
const CO_YEAR_MAP = {
  TYCO: new ObjectId('68f63990dc335227e2601fe2'),
  SYCO: new ObjectId('68f63980dc335227e2601fe1'),
  FYCO: new ObjectId('68f63976dc335227e2601fe0')
};

// Subject code -> desired academic year mapping
const SUBJECT_FIXES = {
  '315002': { name: 'Entrepreneurship Development And Startups', correctYearAbbr: 'TYCO', correctYearId: CO_YEAR_MAP.TYCO },
  '315003': { name: 'Seminar And Project Initiation Course', correctYearAbbr: 'TYCO', correctYearId: CO_YEAR_MAP.TYCO },
  '313002': { name: 'Essence Of Indian Constitution', correctYearAbbr: 'SYCO', correctYearId: CO_YEAR_MAP.SYCO }
};

const CO_DEPT_ID = new ObjectId('68f6390b641c7bcb2781b39c');

async function connectWithRetry(uri, opts = {}, maxRetries = 3, delayMs = 2000) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const client = new MongoClient(uri, opts);
      await client.connect();
      return client;
    } catch (err) {
      attempt += 1;
      console.warn(`🔌 MongoDB connect attempt ${attempt} failed: ${err.message}`);
      if (attempt >= maxRetries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
}

async function fixAcademicYearIds() {
  // prefer a server selection timeout so DNS issues fail fast
  const opts = { serverSelectionTimeoutMS: 5000 };
  let client;
  try {
    client = await connectWithRetry(MONGO_URI, opts, 4, 1500);
    console.log('✅ Connected to MongoDB');

  // use explicit database name if present in URI or fallback to 'feedback'
  const db = client.db('feedback');
    const subjects = db.collection('subjects');
    const facultyAssignments = db.collection('facultyAssignments');

    for (const [subjectCode, fix] of Object.entries(SUBJECT_FIXES)) {
      console.log(`\n🔧 Fixing subject: ${fix.name} (${subjectCode})`);

      // Find the master subject document
      const subject = await subjects.findOne({ subjectCode });
      if (!subject) {
        console.log(`  ⚠️  Subject ${subjectCode} not found`);
        continue;
      }

      console.log(`  📝 Found subject ID: ${subject._id}`);

      // Find facultyAssignments for this subject in CO department that do not have the desired academicYearId
      const incorrectFilter = {
        subjectId: subject._id.toString(),
        departmentId: CO_DEPT_ID.toString(),
        $or: [
          { academicYearId: { $exists: false } },
          { academicYearId: { $ne: fix.correctYearId.toString() } }
        ]
      };

      const incorrectAssignments = await facultyAssignments.find(incorrectFilter).toArray();
      console.log(`  📊 Found ${incorrectAssignments.length} assignments with incorrect academic year`);

      if (incorrectAssignments.length > 0) {
        const result = await facultyAssignments.updateMany(incorrectFilter, {
          $set: {
            academicYearId: fix.correctYearId.toString(),
            updatedAt: new Date()
          }
        });
        console.log(`  ✅ Updated ${result.modifiedCount} assignments to ${fix.correctYearAbbr} (${fix.correctYearId})`);
      }
    }

    console.log('\n🎉 All fixes completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  fixAcademicYearIds().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { fixAcademicYearIds };
