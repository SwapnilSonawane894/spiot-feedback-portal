const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const CO_DEPT_ID = '68f6390b641c7bcb2781b39c';
const EE_DEPT_ID = '68f6390b641c7bcb2781b39d';
const CO_TYCO_YEAR_ID = '68f63990dc335227e2601fe2';
const CO_SYCO_YEAR_ID = '68f63980dc335227e2601fe1';

async function copyAndAssign() {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const wrongDb = client.db('feedbackPortal');
    const correctDb = client.db('feedback');

    // STEP 1: Copy shared subjects
    console.log('📚 STEP 1: Copying shared subjects...\n');
    const sharedSubjects = await wrongDb.collection('subjects').find({
      subjectCode: { $in: ['315002', '315003', '313002'] }
    }).toArray();

    console.log(`Found ${sharedSubjects.length} shared subjects in feedbackPortal`);

    if (sharedSubjects.length === 0) {
      console.log('❌ No shared subjects found! Exiting...');
      return;
    }

    // Upsert subjects into feedback
    const subjectUpserts = sharedSubjects.map(s => ({
      replaceOne: {
        filter: { _id: s._id },
        replacement: s,
        upsert: true
      }
    }));

    const subjectResult = await correctDb.collection('subjects').bulkWrite(subjectUpserts);
    console.log(`✅ Upserted ${subjectResult.upsertedCount + subjectResult.modifiedCount} subjects\n`);

    // STEP 2: Find EE faculty assignments for these subjects (use correctDb because assignments were copied there earlier)
    console.log('👥 STEP 2: Finding EE faculty assignments...\n');
    const subjectIdStrings = sharedSubjects.map(s => s._id.toString());

    const eeAssignments = await correctDb.collection('facultyAssignments').find({
      departmentId: EE_DEPT_ID,
      subjectId: { $in: subjectIdStrings }
    }).toArray();

    console.log(`Found ${eeAssignments.length} EE assignments for shared subjects`);

    // STEP 3: Create CO assignments (clone from EE but change department + academic year)
    console.log('\n📝 STEP 3: Creating CO faculty assignments...\n');
    const coAssignments = [];

    for (const subject of sharedSubjects) {
      const eeAssignment = eeAssignments.find(a => a.subjectId === subject._id.toString());

      if (!eeAssignment) {
        console.log(`⚠️  No EE assignment found for ${subject.name || subject.subjectCode}, skipping...`);
        continue;
      }

      // Determine academic year based on semester
      let academicYearId;
      const sem = typeof subject.semester === 'number' ? subject.semester : parseInt(subject.semester, 10);
      if (sem === 5 || sem === 6) {
        academicYearId = CO_TYCO_YEAR_ID; // Third year
      } else if (sem === 3 || sem === 4) {
        academicYearId = CO_SYCO_YEAR_ID; // Second year
      } else {
        console.log(`⚠️  Unknown semester ${subject.semester} for ${subject.name || subject.subjectCode}, skipping...`);
        continue;
      }

      const newAssignment = {
        _id: new ObjectId(),
        staffId: eeAssignment.staffId, // Use same faculty as EE
        subjectId: subject._id.toString(),
        semester: sem,
        departmentId: CO_DEPT_ID,
        academicYearId: academicYearId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      coAssignments.push(newAssignment);
      console.log(`  ✅ ${subject.name || subject.subjectCode} (${subject.subjectCode})`);
      console.log(`     Faculty: ${eeAssignment.staffId}`);
      console.log(`     Year: ${academicYearId === CO_TYCO_YEAR_ID ? 'TYCO' : 'SYCO'}`);
    }

    if (coAssignments.length === 0) {
      console.log('\n❌ No assignments to create!');
      return;
    }

    // Avoid duplicating: check existing assignments with same subjectId & departmentId
    const existingChecks = await Promise.all(coAssignments.map(a => correctDb.collection('facultyAssignments').findOne({ subjectId: a.subjectId, departmentId: CO_DEPT_ID })));
    const toInsert = coAssignments.filter((_, idx) => !existingChecks[idx]);

    if (toInsert.length === 0) {
      console.log('\nℹ️  No new CO assignments to insert (they already exist)');
    } else {
      const assignmentResult = await correctDb.collection('facultyAssignments').insertMany(toInsert);
      console.log(`\n✅ Created ${assignmentResult.insertedCount} CO faculty assignments`);
    }

    // STEP 4: Verify
    console.log('\n📊 VERIFICATION:\n');
    for (const subject of sharedSubjects) {
      const coCount = await correctDb.collection('facultyAssignments').countDocuments({
        subjectId: subject._id.toString(),
        departmentId: CO_DEPT_ID
      });
      const eeCount = await correctDb.collection('facultyAssignments').countDocuments({
        subjectId: subject._id.toString(),
        departmentId: EE_DEPT_ID
      });
      console.log(`${subject.name || subject.subjectCode} (${subject.subjectCode}):`);
      console.log(`  CO: ${coCount} | EE: ${eeCount}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.close();
  }
}

copyAndAssign();
