const { MongoClient } = require('mongodb');
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const CO_DEPT_ID = '68f6390b641c7bcb2781b39c';

(async function(){
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  try{
    await client.connect();
    const db = client.db('feedback');
    const fa = await db.collection('facultyAssignments').find({ departmentId: CO_DEPT_ID }).toArray();
    console.log('Total facultyAssignments for CO:', fa.length);
    const subjects = await db.collection('subjects').find({}).toArray();
    const subMap = new Map(subjects.map(s=>[s._id.toString(), s]));
    const rows = fa.map(r=>{
      const subj = subMap.get(r.subjectId);
      return {
        assignmentId: r._id.toString(),
        subjectId: r.subjectId,
        subjectCode: subj? subj.subjectCode : null,
        subjectName: subj? subj.name : null,
        subjectAcademicYearId: subj? subj.academicYearId : null,
        assignmentAcademicYearId: r.academicYearId || null,
        staffId: r.staffId
      };
    });
    rows.forEach(r=>{
      console.log('- ', r.assignmentId, 'subjectCode=', r.subjectCode, 'subjectAcademicYearId=', r.subjectAcademicYearId, 'assignmentAcademicYearId=', r.assignmentAcademicYearId, 'staffId=', r.staffId);
    });
    const grouped = {};
    rows.forEach(r=>{const ky=r.subjectAcademicYearId||'NULL'; grouped[ky]=(grouped[ky]||0)+1;});
    console.log('\nGrouped by subject.academicYearId:');
    console.log(grouped);
  }catch(e){console.error(e);}finally{await client.close();}
})();
