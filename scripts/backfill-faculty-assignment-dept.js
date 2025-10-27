const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.DB_NAME || "feedbackPortal";

async function backfill() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    console.log('Scanning facultyAssignments for missing departmentId...');
    const cursor = db.collection('facultyAssignments').find({ $or: [ { departmentId: { $exists: false } }, { departmentId: null } ] });

    let fixed = 0;
    while (await cursor.hasNext()) {
      const fa = await cursor.next();
      if (!fa) break;

      // Strategy: try to infer departmentId from staff -> departmentId
      let deptId = null;
      if (fa.staffId) {
        const staff = await db.collection('staff').findOne({ _id: new ObjectId(fa.staffId) }) || await db.collection('staff').findOne({ id: fa.staffId });
        if (staff && staff.departmentId) deptId = staff.departmentId;
      }

      // Fallback: try to infer from departmentSubjects for subjectId if still missing
      if (!deptId && fa.subjectId) {
        const ds = await db.collection('departmentSubjects').findOne({ subjectId: fa.subjectId });
        if (ds && ds.departmentId) deptId = ds.departmentId;
      }

      if (deptId) {
        const res = await db.collection('facultyAssignments').updateOne({ _id: fa._id }, { $set: { departmentId: String(deptId) } });
        if (res.modifiedCount) fixed++;
      } else {
        console.log('Could not infer departmentId for assignment', fa._id.toString());
      }
    }

    console.log('Backfill complete. Fixed:', fixed);
  } finally {
    await client.close();
  }
}

backfill().catch(err => {
  console.error('Backfill error:', err);
  process.exit(1);
});
