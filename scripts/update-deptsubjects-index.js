const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.DB_NAME || "feedbackPortal";

async function run() {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const coll = db.collection('departmentSubjects');

    console.log('Existing indexes:');
    const existing = await coll.indexes();
    existing.forEach(ix => console.log(` - ${ix.name}: ${JSON.stringify(ix.key)}`));

    const oldName = 'uniq_dept_subject';
    const newName = 'uniq_dept_subject_ay';

    const hasOld = existing.some(ix => ix.name === oldName);
    if (hasOld) {
      console.log(`Dropping old index '${oldName}'`);
      await coll.dropIndex(oldName);
    } else {
      console.log(`Old index '${oldName}' not found (ok).`);
    }

    console.log(`Creating new unique index { departmentId:1, subjectId:1, academicYearId:1 } named '${newName}'`);
    await coll.createIndex({ departmentId: 1, subjectId: 1, academicYearId: 1 }, { unique: true, name: newName });

    console.log('Indexes after change:');
    const after = await coll.indexes();
    after.forEach(ix => console.log(` - ${ix.name}: ${JSON.stringify(ix.key)}`));

    console.log('Index update completed.');
  } catch (err) {
    console.error('Index update failed:', err);
    process.exitCode = 2;
  } finally {
    await client.close();
  }
}

run();
