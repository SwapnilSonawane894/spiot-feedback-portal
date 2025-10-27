const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.DB_NAME || "feedbackPortal";

async function fixAllCrossDeptLinks() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    
    console.log('\n=== FIXING CROSS-DEPARTMENT ACADEMIC YEAR LINKS ===\n');
    
    // Get all departments and academic years
    const departments = await db.collection('departments').find({}).toArray();
    const academicYears = await db.collection('academicYears').find({}).toArray();
    
    // Map: academicYearId -> departmentId (which department owns this AY)
    const ayToDept = {};
    academicYears.forEach(ay => {
      ayToDept[ay._id.toString()] = ay.departmentId;
    });
    
    // Map: departmentId -> info
    const deptMap = {};
    departments.forEach(dept => {
      deptMap[dept._id.toString()] = dept.abbreviation;
    });
    
    console.log('Departments found:', Object.values(deptMap).join(', '));
    console.log('Academic years found:', academicYears.length);
    
    // Find ALL departmentSubjects
    const allLinks = await db.collection('departmentSubjects').find({}).toArray();
    console.log(`\nTotal departmentSubjects entries: ${allLinks.length}`);
    
    const toDelete = [];
    const valid = [];
    
    for (const link of allLinks) {
      const linkDept = link.departmentId;
      const linkAY = link.academicYearId;
      
      if (!linkAY) {
        // Skip null academic years (already handled by previous fix)
        valid.push(link);
        continue;
      }
      
      // Check if this academic year belongs to the link's department
      const ayOwnerDept = ayToDept[linkAY];
      
      if (ayOwnerDept !== linkDept) {
        // WRONG: Department linked to another department's academic year
        toDelete.push({
          _id: link._id,
          linkDept: deptMap[linkDept] || 'UNKNOWN',
          ayOwnerDept: deptMap[ayOwnerDept] || 'UNKNOWN',
          subjectId: link.subjectId
        });
      } else {
        valid.push(link);
      }
    }
    
    console.log(`\n✅ Valid links: ${valid.length}`);
    console.log(`❌ Invalid links (wrong academic year): ${toDelete.length}`);
    
    if (toDelete.length === 0) {
      console.log('\n🎉 No invalid links found! Database is clean.');
      return;
    }
    
    // Get subject info for better logging
    const subjectIds = [...new Set(toDelete.map(d => d.subjectId))];
    const subjects = await db.collection('subjects').find({
      _id: { $in: subjectIds.map(id => new ObjectId(id)) }
    }).toArray();
    
    const subjectMap = {};
    subjects.forEach(s => {
      subjectMap[s._id.toString()] = `${s.name} (${s.subjectCode})`;
    });
    
    // Group by department
    const byDept = {};
    toDelete.forEach(item => {
      if (!byDept[item.linkDept]) byDept[item.linkDept] = [];
      byDept[item.linkDept].push({
        ...item,
        subjectName: subjectMap[item.subjectId] || 'UNKNOWN'
      });
    });
    
    console.log('\n=== INVALID LINKS TO DELETE ===\n');
    for (const [dept, items] of Object.entries(byDept)) {
      console.log(`${dept} Department (${items.length} invalid links):`);
      items.forEach(item => {
        console.log(`  ❌ ${item.subjectName}`);
        console.log(`     Reason: Linked to ${item.ayOwnerDept}'s academic year`);
      });
      console.log('');
    }
    
    // Delete invalid links
    console.log('Deleting invalid links...');
    const idsToDelete = toDelete.map(d => d._id);
    const result = await db.collection('departmentSubjects').deleteMany({
      _id: { $in: idsToDelete }
    });
    
    console.log(`\n✅ Deleted ${result.deletedCount} invalid links`);
    console.log(`✅ Remaining valid links: ${valid.length}`);
    
    // Verify
    const remaining = await db.collection('departmentSubjects').find({}).toArray();
    console.log(`\n🔍 Verification: ${remaining.length} total links in database`);
    
  } finally {
    await client.close();
  }
}

fixAllCrossDeptLinks().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
