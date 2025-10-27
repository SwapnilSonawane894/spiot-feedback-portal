// MongoDB Shell script for fixing academicYearId on facultyAssignments.
// This can be run in MongoDB Compass -> Aggregations tab or Atlas Data Explorer -> Run Command (JavaScript).

// Use from the 'feedback' database
const db = db.getSiblingDB('feedback');

function fixForSubjectCode(subjectCode, targetYearId, deptId) {
  const subj = db.subjects.findOne({ subjectCode });
  if (!subj) {
    print(`Subject ${subjectCode} not found`);
    return;
  }
  const filter = { subjectId: subj._id.toString(), departmentId: deptId, academicYearId: { $ne: targetYearId } };
  const existing = db.facultyAssignments.find(filter).toArray();
  print(`Found ${existing.length} assignments for ${subjectCode} to update`);
  if (existing.length > 0) {
    const r = db.facultyAssignments.updateMany(filter, { $set: { academicYearId: targetYearId, updatedAt: new Date() } });
    print(`Updated ${r.modifiedCount} documents for subject ${subjectCode}`);
  }
}

const CO_DEPT_ID = '68f6390b641c7bcb2781b39c';
const TYCO_YEAR_ID = '68f63990dc335227e2601fe2';
const SYCO_YEAR_ID = '68f63980dc335227e2601fe1';

print('\nFixing 315002 -> TYCO');
fixForSubjectCode('315002', TYCO_YEAR_ID, CO_DEPT_ID);
print('\nFixing 315003 -> TYCO');
fixForSubjectCode('315003', TYCO_YEAR_ID, CO_DEPT_ID);
print('\nFixing 313002 -> SYCO');
fixForSubjectCode('313002', SYCO_YEAR_ID, CO_DEPT_ID);

print('\nDone');
