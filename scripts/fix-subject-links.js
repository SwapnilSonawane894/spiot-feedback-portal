const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.DB_NAME || "feedbackPortal";

const correctMappings = {
  '315002': [ // Entrepreneurship Development And Startups
    { deptAbbr: 'CO', ayId: '68f63990dc335227e2601fe2' }, // TYCO
    { deptAbbr: 'CO', ayId: '68fc86d399ba276515402d23' }, // TYEE  
    { deptAbbr: 'EE', ayId: '68fc86d399ba276515402d23' }  // TYEE
  ],
  '315003': [ // Seminar And Project Initiation Course
    { deptAbbr: 'CO', ayId: '68f63990dc335227e2601fe2' }, // TYCO
    { deptAbbr: 'CO', ayId: '68fc86d399ba276515402d23' }, // TYEE
    { deptAbbr: 'EE', ayId: '68fc86d399ba276515402d23' }  // TYEE
  ],
  '313303': [ // Digital Techniques
    { deptAbbr: 'CO', ayId: '68f63980dc335227e2601fe1' }  // SYCO only
  ],
  '313002': [ // Essence Of Indian Constitution
    { deptAbbr: 'CO', ayId: '68f63980dc335227e2601fe1' }, // SYCO
    { deptAbbr: 'EE', ayId: '68fc86be99ba276515402d22' }  // SYEE
  ]
};

async function fixLinks() {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);

    // load departments map to get _id strings by abbreviation
    const departments = await db.collection('departments').find({ abbreviation: { $in: ['CO','EE'] } }).toArray();
    const deptByAbbr = {};
    departments.forEach(d => { deptByAbbr[d.abbreviation] = d._id.toString(); });

    console.log('Found departments:', Object.keys(deptByAbbr).map(k => `${k}=${deptByAbbr[k]}`).join(', '));

    for (const [code, links] of Object.entries(correctMappings)) {
      console.log(`\n--- Processing subjectCode ${code} ---`);

      const subject = await db.collection('subjects').findOne({ subjectCode: code });
      if (!subject) {
        console.log(`Subject with code ${code} not found; skipping.`);
        continue;
      }
      const subjectIdStr = subject._id.toString();

      // Delete existing links for this subject
      const delRes = await db.collection('departmentSubjects').deleteMany({ subjectId: subjectIdStr });
      console.log(`Deleted ${delRes.deletedCount} existing departmentSubjects links for subject ${code}`);

      // Prepare new links
      const inserts = [];
      for (const l of links) {
        const deptId = deptByAbbr[l.deptAbbr];
        if (!deptId) {
          console.warn(`  WARNING: department abbreviation ${l.deptAbbr} not found in departments collection. Skipping link.`);
          continue;
        }
        inserts.push({
          departmentId: deptId,
          subjectId: subjectIdStr,
          academicYearId: l.ayId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      if (inserts.length === 0) {
        console.log(`No valid links to insert for ${code}.`);
        continue;
      }

      const insRes = await db.collection('departmentSubjects').insertMany(inserts, { ordered: false });
      console.log(`Inserted ${insRes.insertedCount} new departmentSubjects links for subject ${code}`);
    }

    console.log('\nAll fixes applied.');
  } catch (err) {
    console.error('Error while fixing links:', err);
    process.exitCode = 2;
  } finally {
    await client.close();
  }
}

fixLinks();
