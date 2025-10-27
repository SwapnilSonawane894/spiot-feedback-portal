const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.DB_NAME || "feedbackPortal";

async function fixNullAcademicYears() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    console.log('\nStarting fix for departmentSubjects with null academicYearId...\n');

    const nullEntries = await db.collection('departmentSubjects')
      .find({ academicYearId: null })
      .toArray();

    console.log(`Found ${nullEntries.length} entries to fix\n`);

    let fixed = 0;
    let cannotFix = 0;

    for (const entry of nullEntries) {
      try {
        // subjectId may be stored as a string or ObjectId; coerce
        const subjectIdObj = typeof entry.subjectId === 'string' ? new ObjectId(entry.subjectId) : entry.subjectId;
        const subject = await db.collection('subjects').findOne({ _id: subjectIdObj });

        if (subject && subject.academicYearId) {
          // Convert academicYearId to string for departmentSubjects (consistent with existing rows)
          const ay = typeof subject.academicYearId === 'string' ? subject.academicYearId : (subject.academicYearId && subject.academicYearId.toString());

          if (!ay) {
            console.log(`✗ Skipping: ${subject.subjectCode || entry.subjectId} - subject.academicYearId empty after toString()`);
            cannotFix++;
            continue;
          }

          const res = await db.collection('departmentSubjects').updateOne(
            { _id: entry._id, academicYearId: null },
            { $set: { academicYearId: ay, updatedAt: new Date().toISOString() } }
          );

          if (res.modifiedCount === 1) {
            console.log(`✓ Fixed: ${subject.subjectCode || entry.subjectId} - copied AY ID: ${ay}`);
            fixed++;
          } else {
            console.log(`✗ No-op (was already changed?): ${subject.subjectCode || entry.subjectId}`);
          }
        } else {
          console.log(`✗ Cannot fix: ${entry.subjectId} - subject not found or has null academicYearId`);
          cannotFix++;
        }
      } catch (err) {
        console.log(`✗ Error processing entry ${entry._id.toString()}:`, err.message);
        cannotFix++;
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Fixed: ${fixed}`);
    console.log(`Cannot auto-fix: ${cannotFix}\n`);

  } finally {
    await client.close();
  }
}

fixNullAcademicYears().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
