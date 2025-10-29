// --- Replace with your test data ---
const STUDENT_EMAIL = "23213070244";
// ---

// 1. Get Student and their Department/Year Info
const student = db.getCollection('users').findOne({ email: STUDENT_EMAIL });
const studentDept = student ? db.getCollection('departments').findOne({ "_id": new ObjectId(student.departmentId) }) : null;
const studentYear = student ? db.getCollection('academicYears').findOne({ "_id": new ObjectId(student.academicYearId) }) : null;

print("--- Student Info ---");
printjson(student);
print("--- Department Info ---");
printjson(studentDept);
print("--- Academic Year Info ---");
printjson(studentYear);


if (student) {
    const departmentId = student.departmentId.toString();

    // 2. Get all subjects linked to the student's department
    const departmentSubjectLinks = db.getCollection('departmentSubjects').find({ departmentId: departmentId }).toArray();
    const subjectIdsFromLinks = departmentSubjectLinks.map(ds => new ObjectId(ds.subjectId));

    print(`\n--- Found ${departmentSubjectLinks.length} subject links for department ${studentDept.abbreviation} ---`);
    printjson(departmentSubjectLinks.slice(0, 5)); // Print first 5 links

    // 3. Get all assignments for those subjects
    const assignmentsForDeptSubjects = db.getCollection('facultyAssignments').find({ subjectId: { $in: subjectIdsFromLinks.map(String) } }).toArray();
    
    print(`\n--- Found ${assignmentsForDeptSubjects.length} assignments linked to this department's subjects ---`);

    // 4. Filter assignments by the student's academic year
    const finalAssignments = assignmentsForDeptSubjects.filter(a => a.academicYearId && a.academicYearId.toString() === student.academicYearId.toString());

    print(`\n--- Found ${finalAssignments.length} assignments matching the student's academic year ---`);
    printjson(finalAssignments);
}