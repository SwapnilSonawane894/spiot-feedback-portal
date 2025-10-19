import { firestore } from '../src/lib/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import * as bcrypt from 'bcrypt';

const COLLECTIONS = {
  USERS: 'users',
  DEPARTMENTS: 'departments',
  STAFF: 'staff',
  ACADEMIC_YEARS: 'academicYears',
  SUBJECTS: 'subjects',
  FACULTY_ASSIGNMENTS: 'facultyAssignments',
  FEEDBACK: 'feedback',
  HOD_SUGGESTIONS: 'hodSuggestions',
};

async function clearCollection(collectionName: string) {
  const batch = firestore.batch();
  const snapshot = await firestore.collection(collectionName).get();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log(`✓ Cleared ${collectionName} collection (${snapshot.size} documents)`);
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await clearCollection(COLLECTIONS.FEEDBACK);
    await clearCollection(COLLECTIONS.HOD_SUGGESTIONS);
    await clearCollection(COLLECTIONS.FACULTY_ASSIGNMENTS);
    await clearCollection(COLLECTIONS.SUBJECTS);
    await clearCollection(COLLECTIONS.STAFF);
    await clearCollection(COLLECTIONS.USERS);
    await clearCollection(COLLECTIONS.ACADEMIC_YEARS);
    await clearCollection(COLLECTIONS.DEPARTMENTS);
    console.log('');

    // 1. Create Academic Years
    console.log('📚 Creating academic years...');
    const academicYears = [
      { name: 'First Year Engineering', abbreviation: 'FE' },
      { name: 'Second Year Computer Engineering', abbreviation: 'SYCO' },
      { name: 'Third Year Computer Engineering', abbreviation: 'TYCO' },
      { name: 'Final Year Computer Engineering', abbreviation: 'BECO' },
    ];

    const academicYearIds: Record<string, string> = {};
    for (const year of academicYears) {
      const docRef = await firestore.collection(COLLECTIONS.ACADEMIC_YEARS).add({
        ...year,
        createdAt: FieldValue.serverTimestamp(),
      });
      academicYearIds[year.abbreviation] = docRef.id;
      console.log(`  ✓ ${year.name}`);
    }
    console.log('');

    // 2. Create Departments
    console.log('🏢 Creating departments...');
    const departments = [
      { name: 'Computer Engineering', abbreviation: 'CO', isFeedbackActive: true },
      { name: 'Information Technology', abbreviation: 'IT', isFeedbackActive: true },
      { name: 'Electronics Engineering', abbreviation: 'EXTC', isFeedbackActive: false },
    ];

    const departmentIds: Record<string, string> = {};
    for (const dept of departments) {
      const docRef = await firestore.collection(COLLECTIONS.DEPARTMENTS).add({
        ...dept,
        hodId: null,
        createdAt: FieldValue.serverTimestamp(),
      });
      departmentIds[dept.abbreviation] = docRef.id;
      console.log(`  ✓ ${dept.name}`);
    }
    console.log('');

    // 3. Create Users (Admin, HODs, Staff, Students)
    console.log('👥 Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Admin
    const adminRef = await firestore.collection(COLLECTIONS.USERS).add({
      name: 'System Administrator',
      email: 'admin@spiot.edu',
      hashedPassword,
      role: 'ADMIN',
      departmentId: null,
      academicYearId: null,
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log('  ✓ Admin: admin@spiot.edu');

    // HODs
    const hodData = [
      { name: 'Dr. Rajesh Kumar', email: 'rajesh.kumar@spiot.edu', dept: 'CO' },
      { name: 'Dr. Priya Sharma', email: 'priya.sharma@spiot.edu', dept: 'IT' },
      { name: 'Dr. Amit Patel', email: 'amit.patel@spiot.edu', dept: 'EXTC' },
    ];

    const hodUserIds: Record<string, string> = {};
    for (const hod of hodData) {
      const userRef = await firestore.collection(COLLECTIONS.USERS).add({
        name: hod.name,
        email: hod.email,
        hashedPassword,
        role: 'HOD',
        departmentId: departmentIds[hod.dept],
        academicYearId: null,
        createdAt: FieldValue.serverTimestamp(),
      });
      hodUserIds[hod.dept] = userRef.id;
      console.log(`  ✓ HOD: ${hod.name} (${hod.dept})`);
    }

    // Staff Members
    const staffData = [
      { name: 'Prof. Suresh Desai', email: 'suresh.desai@spiot.edu', dept: 'CO' },
      { name: 'Prof. Anjali Mehta', email: 'anjali.mehta@spiot.edu', dept: 'CO' },
      { name: 'Prof. Vikram Singh', email: 'vikram.singh@spiot.edu', dept: 'CO' },
      { name: 'Prof. Sneha Joshi', email: 'sneha.joshi@spiot.edu', dept: 'IT' },
      { name: 'Prof. Rahul Verma', email: 'rahul.verma@spiot.edu', dept: 'IT' },
    ];

    const staffUserIds: string[] = [];
    for (const staff of staffData) {
      const userRef = await firestore.collection(COLLECTIONS.USERS).add({
        name: staff.name,
        email: staff.email,
        hashedPassword,
        role: 'STAFF',
        departmentId: departmentIds[staff.dept],
        academicYearId: null,
        createdAt: FieldValue.serverTimestamp(),
      });
      staffUserIds.push(userRef.id);
      console.log(`  ✓ Staff: ${staff.name} (${staff.dept})`);
    }

    // Students
    const studentData = [
      { name: 'Aarav Gupta', enrollment: '2023CO001', year: 'SYCO', dept: 'CO' },
      { name: 'Diya Reddy', enrollment: '2023CO002', year: 'SYCO', dept: 'CO' },
      { name: 'Arjun Nair', enrollment: '2023CO003', year: 'SYCO', dept: 'CO' },
      { name: 'Ananya Iyer', enrollment: '2023CO004', year: 'SYCO', dept: 'CO' },
      { name: 'Rohan Shah', enrollment: '2023CO005', year: 'SYCO', dept: 'CO' },
      { name: 'Ishaan Pillai', enrollment: '2023IT001', year: 'SYCO', dept: 'IT' },
      { name: 'Kavya Menon', enrollment: '2023IT002', year: 'SYCO', dept: 'IT' },
      { name: 'Aditya Rao', enrollment: '2023IT003', year: 'SYCO', dept: 'IT' },
    ];

    const studentUserIds: Record<string, string> = {};
    for (const student of studentData) {
      const hashedStudentPassword = await bcrypt.hash(student.enrollment, 10);
      const userRef = await firestore.collection(COLLECTIONS.USERS).add({
        name: student.name,
        email: `${student.enrollment.toLowerCase()}@student.spiot.edu`,
        hashedPassword: hashedStudentPassword,
        role: 'STUDENT',
        departmentId: departmentIds[student.dept],
        academicYearId: academicYearIds[student.year],
        createdAt: FieldValue.serverTimestamp(),
      });
      studentUserIds[student.enrollment] = userRef.id;
      console.log(`  ✓ Student: ${student.name} (${student.enrollment})`);
    }
    console.log('');

    // 4. Create Staff Profiles
    console.log('👔 Creating staff profiles...');
    const staffProfileIds: Record<string, string> = {};
    
    // HOD Staff Profiles
    const hodStaffMapping = [
      { userId: hodUserIds['CO'], dept: 'CO', key: 'hod_co' },
      { userId: hodUserIds['IT'], dept: 'IT', key: 'hod_it' },
      { userId: hodUserIds['EXTC'], dept: 'EXTC', key: 'hod_extc' },
    ];

    for (const mapping of hodStaffMapping) {
      const staffRef = await firestore.collection(COLLECTIONS.STAFF).add({
        userId: mapping.userId,
        departmentId: departmentIds[mapping.dept],
        createdAt: FieldValue.serverTimestamp(),
      });
      staffProfileIds[mapping.key] = staffRef.id;
      
      // Update department with HOD
      await firestore.collection(COLLECTIONS.DEPARTMENTS).doc(departmentIds[mapping.dept]).update({
        hodId: staffRef.id,
      });
      console.log(`  ✓ HOD Staff Profile (${mapping.dept})`);
    }

    // Regular Staff Profiles
    const regularStaffMapping = [
      { userId: staffUserIds[0], dept: 'CO', key: 'staff_co_1' },
      { userId: staffUserIds[1], dept: 'CO', key: 'staff_co_2' },
      { userId: staffUserIds[2], dept: 'CO', key: 'staff_co_3' },
      { userId: staffUserIds[3], dept: 'IT', key: 'staff_it_1' },
      { userId: staffUserIds[4], dept: 'IT', key: 'staff_it_2' },
    ];

    for (const mapping of regularStaffMapping) {
      const staffRef = await firestore.collection(COLLECTIONS.STAFF).add({
        userId: mapping.userId,
        departmentId: departmentIds[mapping.dept],
        createdAt: FieldValue.serverTimestamp(),
      });
      staffProfileIds[mapping.key] = staffRef.id;
      console.log(`  ✓ Regular Staff Profile`);
    }
    console.log('');

    // 5. Create Subjects
    console.log('📖 Creating subjects...');
    const subjects = [
      { name: 'Data Structures', code: 'CO201', year: 'SYCO' },
      { name: 'Object Oriented Programming', code: 'CO202', year: 'SYCO' },
      { name: 'Database Management Systems', code: 'CO203', year: 'SYCO' },
      { name: 'Computer Networks', code: 'CO204', year: 'SYCO' },
      { name: 'Web Technologies', code: 'IT201', year: 'SYCO' },
      { name: 'Software Engineering', code: 'IT202', year: 'SYCO' },
    ];

    const subjectIds: Record<string, string> = {};
    for (const subject of subjects) {
      const subjectRef = await firestore.collection(COLLECTIONS.SUBJECTS).add({
        name: subject.name,
        subjectCode: subject.code,
        academicYearId: academicYearIds[subject.year],
        createdAt: FieldValue.serverTimestamp(),
      });
      subjectIds[subject.code] = subjectRef.id;
      console.log(`  ✓ ${subject.name} (${subject.code})`);
    }
    console.log('');

    // 6. Create Faculty Assignments
    console.log('📝 Creating faculty assignments...');
    const semester = 'Odd 2025-26';
    const assignments = [
      { staffKey: 'staff_co_1', subjectCode: 'CO201' },
      { staffKey: 'staff_co_2', subjectCode: 'CO202' },
      { staffKey: 'staff_co_3', subjectCode: 'CO203' },
      { staffKey: 'staff_co_1', subjectCode: 'CO204' },
      { staffKey: 'staff_it_1', subjectCode: 'IT201' },
      { staffKey: 'staff_it_2', subjectCode: 'IT202' },
    ];

    const assignmentIds: string[] = [];
    for (const assignment of assignments) {
      const assignmentRef = await firestore.collection(COLLECTIONS.FACULTY_ASSIGNMENTS).add({
        semester,
        staffId: staffProfileIds[assignment.staffKey],
        subjectId: subjectIds[assignment.subjectCode],
        createdAt: FieldValue.serverTimestamp(),
      });
      assignmentIds.push(assignmentRef.id);
      console.log(`  ✓ Assignment: ${assignment.subjectCode} → ${assignment.staffKey}`);
    }
    console.log('');

    // 7. Create Feedback
    console.log('💬 Creating feedback entries...');
    let feedbackCount = 0;

    // Generate random feedback ratings between 3-5
    const getRandomRating = () => Math.floor(Math.random() * 3) + 3;

    for (const assignmentId of assignmentIds) {
      // Get 3-5 students to provide feedback for each assignment
      const studentEnrollments = Object.keys(studentUserIds).slice(0, 5);
      
      for (const enrollment of studentEnrollments) {
        const feedbackRef = await firestore.collection(COLLECTIONS.FEEDBACK).add({
          studentId: studentUserIds[enrollment],
          assignmentId,
          coverage_of_syllabus: getRandomRating(),
          covering_relevant_topics_beyond_syllabus: getRandomRating(),
          effectiveness_technical_contents: getRandomRating(),
          effectiveness_communication_skills: getRandomRating(),
          effectiveness_teaching_aids: getRandomRating(),
          motivation_self_learning: getRandomRating(),
          support_practical_performance: getRandomRating(),
          support_project_seminar: getRandomRating(),
          feedback_on_student_progress: getRandomRating(),
          punctuality_and_discipline: getRandomRating(),
          domain_knowledge: getRandomRating(),
          interaction_with_students: getRandomRating(),
          ability_to_resolve_difficulties: getRandomRating(),
          encourage_cocurricular: getRandomRating(),
          encourage_extracurricular: getRandomRating(),
          guidance_during_internship: getRandomRating(),
          isReleased: false,
          any_suggestion: feedbackCount % 3 === 0 ? 'Great teaching! Very helpful.' : null,
          createdAt: FieldValue.serverTimestamp(),
        });
        feedbackCount++;
      }
    }
    console.log(`  ✓ Created ${feedbackCount} feedback entries`);
    console.log('');

    // 8. Create HOD Suggestions
    console.log('💡 Creating HOD suggestions...');
    const hodSuggestions = [
      { staffKey: 'staff_co_1', content: 'Excellent performance in Data Structures. Students are showing great improvement.' },
      { staffKey: 'staff_co_2', content: 'Good teaching approach. Consider adding more practical examples in OOP.' },
      { staffKey: 'staff_it_1', content: 'Very effective in Web Technologies. Keep up the good work.' },
    ];

    for (const suggestion of hodSuggestions) {
      await firestore.collection(COLLECTIONS.HOD_SUGGESTIONS).add({
        staffId: staffProfileIds[suggestion.staffKey],
        semester,
        content: suggestion.content,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`  ✓ HOD Suggestion for ${suggestion.staffKey}`);
    }
    console.log('');

    console.log('✅ Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`  • ${academicYears.length} Academic Years`);
    console.log(`  • ${departments.length} Departments`);
    console.log(`  • 1 Admin`);
    console.log(`  • ${hodData.length} HODs`);
    console.log(`  • ${staffData.length} Staff Members`);
    console.log(`  • ${studentData.length} Students`);
    console.log(`  • ${subjects.length} Subjects`);
    console.log(`  • ${assignments.length} Faculty Assignments`);
    console.log(`  • ${feedbackCount} Feedback Entries`);
    console.log(`  • ${hodSuggestions.length} HOD Suggestions`);
    console.log('\n🔑 Login Credentials:');
    console.log('  Admin: admin@spiot.edu / password123');
    console.log('  HOD (CO): rajesh.kumar@spiot.edu / password123');
    console.log('  Staff: suresh.desai@spiot.edu / password123');
    console.log('  Student: 2023co001@student.spiot.edu / 2023CO001');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

seedDatabase()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
