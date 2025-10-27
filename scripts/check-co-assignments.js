const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || "";
const DB_NAME = process.env.DB_NAME || "feedbackPortal";

async function main() {
  if (!MONGO_URI) {
    console.error('MONGO_URI not set in env. Set it or export it before running.');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log('\n📊 Checking CO assignments for external (SAH) staff...\n');

    const assignments = await db.collection('facultyAssignments')
      .find({
        departmentId: '68f6390b641c7bcb2781b39c',  // CO department
        semester: 'Odd Semester 2025-26'
      })
      .toArray();

    console.log(`Found ${assignments.length} CO assignments total\n`);

    let coStaffCount = 0;
    let externalStaffCount = 0;

    for (const a of assignments) {
      let staff = null;
      try {
        staff = a.staffId ? await db.collection('staff').findOne({ _id: new ObjectId(a.staffId) }) : null;
      } catch (e) {
        // staffId might not be an ObjectId string — try as string field
        staff = await db.collection('staff').findOne({ id: a.staffId }) || await db.collection('staff').findOne({ _id: a.staffId });
      }

      if (!staff) {
        console.log(`❌ Staff not found for ID: ${a.staffId}`);
        continue;
      }

      let dept = null;
      try {
        dept = staff.departmentId ? await db.collection('departments').findOne({ _id: new ObjectId(staff.departmentId) }) : null;
      } catch (e) {
        dept = await db.collection('departments').findOne({ id: staff.departmentId }) || await db.collection('departments').findOne({ _id: staff.departmentId });
      }
      const deptAbbr = dept?.abbreviation || 'UNKNOWN';

      let subject = null;
      try {
        subject = a.subjectId ? await db.collection('subjects').findOne({ _id: new ObjectId(a.subjectId) }) : null;
      } catch (e) {
        subject = await db.collection('subjects').findOne({ id: a.subjectId }) || await db.collection('subjects').findOne({ _id: a.subjectId });
      }

      if (deptAbbr === 'CO') {
        coStaffCount++;
      } else {
        externalStaffCount++;
        console.log(`✓ External: ${staff.name || staff.id || 'Unknown'} (${deptAbbr}) → ${subject?.name || 'Unknown subject'}`);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   CO staff assignments: ${coStaffCount}`);
    console.log(`   External staff assignments: ${externalStaffCount}`);

    if (externalStaffCount === 0) {
      console.log('\n❌ NO EXTERNAL STAFF FOUND!');
      console.log('   Action needed: Login as CO HOD and assign SAH staff via Faculty Assignment page');
    }

  } catch (err) {
    console.error('Error checking CO assignments:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main().catch(console.error);
