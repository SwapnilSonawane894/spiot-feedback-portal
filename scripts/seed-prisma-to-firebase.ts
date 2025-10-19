import { firestore } from '../src/lib/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import * as bcrypt from 'bcrypt';

const COLLECTIONS = {
  USERS: 'users',
  ACCOUNTS: 'accounts',
  SESSIONS: 'sessions',
  DEPARTMENTS: 'departments',
  STAFF: 'staff',
  ACADEMIC_YEARS: 'academicYears',
  SUBJECTS: 'subjects',
  FACULTY_ASSIGNMENTS: 'facultyAssignments',
  FEEDBACK: 'feedback',
  HOD_SUGGESTIONS: 'hodSuggestions',
};

// Helper to generate IDs
function generateId() {
  return firestore.collection('_temp').doc().id;
}

async function seedPrismaStructure() {
  try {
    console.log('🌱 SEEDING PRISMA SCHEMA TO FIREBASE\n');
    console.log('Creating data matching your Prisma database structure...\n');

    // Store IDs for relationships
    const ids: any = {
      academicYears: {},
      departments: {},
      users: {},
      staff: {},
      subjects: {},
      assignments: {},
    };

    // ============================================
    // 1. ACADEMIC YEARS
    // ============================================
    console.log('📚 Creating Academic Years...');
    const academicYearsData = [
      { name: 'First Year', abbreviation: 'FE' },
      { name: 'Second Year Computer Engineering', abbreviation: 'SYCO' },
      { name: 'Third Year Computer Engineering', abbreviation: 'TYCO' },
      { name: 'Final Year Computer Engineering', abbreviation: 'BECO' },
    ];

    for (const yearData of academicYearsData) {
      const id = generateId();
      await firestore.collection(COLLECTIONS.ACADEMIC_YEARS).doc(id).set({
        id,
        name: yearData.name,
        abbreviation: yearData.abbreviation,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      ids.academicYears[yearData.abbreviation] = id;
      console.log(`  ✓ ${yearData.name} (${yearData.abbreviation})`);
    }
    console.log('');

    // ============================================
    // 2. DEPARTMENTS
    // ============================================
    console.log('🏢 Creating Departments...');
    const departmentsData = [
      { name: 'Computer Engineering', abbreviation: 'CO', isFeedbackActive: true },
      { name: 'Information Technology', abbreviation: 'IT', isFeedbackActive: true },
      { name: 'Electronics and Telecommunication', abbreviation: 'EXTC', isFeedbackActive: false },
    ];

    for (const deptData of departmentsData) {
      const id = generateId();
      await firestore.collection(COLLECTIONS.DEPARTMENTS).doc(id).set({
        id,
        name: deptData.name,
        abbreviation: deptData.abbreviation,
        isFeedbackActive: deptData.isFeedbackActive,
        hodId: null, // Will be updated after staff creation
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      ids.departments[deptData.abbreviation] = id;
      console.log(`  ✓ ${deptData.name} (${deptData.abbreviation})`);
    }
    console.log('');

    // ============================================
    // 3. USERS (Admin, HODs, Staff, Students)
    // ============================================
    console.log('👥 Creating Users...');
    
    const hashedPassword = await bcrypt.hash('password123', 10);

    // ADMIN
    const adminId = generateId();
    await firestore.collection(COLLECTIONS.USERS).doc(adminId).set({
      id: adminId,
      name: 'Admin User',
      email: 'admin@spiot.edu',
      hashedPassword,
      role: 'ADMIN',
      departmentId: null,
      academicYearId: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    ids.users['admin'] = adminId;
    console.log('  ✓ Admin: admin@spiot.edu');

    // HODs
    const hodUsers = [
      { key: 'hod_co', name: 'Dr. Rajesh Kumar', email: 'rajesh.kumar@spiot.edu', dept: 'CO' },
      { key: 'hod_it', name: 'Dr. Priya Sharma', email: 'priya.sharma@spiot.edu', dept: 'IT' },
      { key: 'hod_extc', name: 'Dr. Amit Patel', email: 'amit.patel@spiot.edu', dept: 'EXTC' },
    ];

    for (const hod of hodUsers) {
      const id = generateId();
      await firestore.collection(COLLECTIONS.USERS).doc(id).set({
        id,
        name: hod.name,
        email: hod.email,
        hashedPassword,
        role: 'HOD',
        departmentId: ids.departments[hod.dept],
        academicYearId: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      ids.users[hod.key] = id;
      console.log(`  ✓ HOD: ${hod.name} (${hod.dept})`);
    }

    // STAFF
    const staffUsers = [
      { key: 'staff_co_1', name: 'Prof. Suresh Desai', email: 'suresh.desai@spiot.edu', dept: 'CO' },
      { key: 'staff_co_2', name: 'Prof. Anjali Mehta', email: 'anjali.mehta@spiot.edu', dept: 'CO' },
      { key: 'staff_co_3', name: 'Prof. Vikram Singh', email: 'vikram.singh@spiot.edu', dept: 'CO' },
      { key: 'staff_it_1', name: 'Prof. Sneha Joshi', email: 'sneha.joshi@spiot.edu', dept: 'IT' },
      { key: 'staff_it_2', name: 'Prof. Rahul Verma', email: 'rahul.verma@spiot.edu', dept: 'IT' },
      { key: 'staff_extc_1', name: 'Prof. Kavita Rane', email: 'kavita.rane@spiot.edu', dept: 'EXTC' },
    ];

    for (const staff of staffUsers) {
      const id = generateId();
      await firestore.collection(COLLECTIONS.USERS).doc(id).set({
        id,
        name: staff.name,
        email: staff.email,
        hashedPassword,
        role: 'STAFF',
        departmentId: ids.departments[staff.dept],
        academicYearId: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      ids.users[staff.key] = id;
      console.log(`  ✓ Staff: ${staff.name} (${staff.dept})`);
    }

    // STUDENTS
    const studentUsers = [
      { key: 'student_co_1', name: 'Aarav Gupta', enrollment: '2023CO001', year: 'SYCO', dept: 'CO' },
      { key: 'student_co_2', name: 'Diya Reddy', enrollment: '2023CO002', year: 'SYCO', dept: 'CO' },
      { key: 'student_co_3', name: 'Arjun Nair', enrollment: '2023CO003', year: 'SYCO', dept: 'CO' },
      { key: 'student_co_4', name: 'Ananya Iyer', enrollment: '2023CO004', year: 'SYCO', dept: 'CO' },
      { key: 'student_co_5', name: 'Rohan Shah', enrollment: '2023CO005', year: 'SYCO', dept: 'CO' },
      { key: 'student_co_6', name: 'Priya Kulkarni', enrollment: '2023CO006', year: 'SYCO', dept: 'CO' },
      { key: 'student_co_7', name: 'Karan Malhotra', enrollment: '2023CO007', year: 'SYCO', dept: 'CO' },
      { key: 'student_co_8', name: 'Neha Patil', enrollment: '2023CO008', year: 'SYCO', dept: 'CO' },
      { key: 'student_it_1', name: 'Ishaan Pillai', enrollment: '2023IT001', year: 'SYCO', dept: 'IT' },
      { key: 'student_it_2', name: 'Kavya Menon', enrollment: '2023IT002', year: 'SYCO', dept: 'IT' },
      { key: 'student_it_3', name: 'Aditya Rao', enrollment: '2023IT003', year: 'SYCO', dept: 'IT' },
      { key: 'student_it_4', name: 'Simran Kapoor', enrollment: '2023IT004', year: 'SYCO', dept: 'IT' },
    ];

    for (const student of studentUsers) {
      const id = generateId();
      const studentPassword = await bcrypt.hash(student.enrollment, 10);
      await firestore.collection(COLLECTIONS.USERS).doc(id).set({
        id,
        name: student.name,
        email: `${student.enrollment.toLowerCase()}@student.spiot.edu`,
        hashedPassword: studentPassword,
        role: 'STUDENT',
        departmentId: ids.departments[student.dept],
        academicYearId: ids.academicYears[student.year],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      ids.users[student.key] = id;
      console.log(`  ✓ Student: ${student.name} (${student.enrollment})`);
    }
    console.log('');

    // ============================================
    // 4. STAFF PROFILES
    // ============================================
    console.log('👔 Creating Staff Profiles...');
    
    const staffProfiles = [
      { key: 'hod_co', userKey: 'hod_co', dept: 'CO', isHOD: true },
      { key: 'hod_it', userKey: 'hod_it', dept: 'IT', isHOD: true },
      { key: 'hod_extc', userKey: 'hod_extc', dept: 'EXTC', isHOD: true },
      { key: 'staff_co_1', userKey: 'staff_co_1', dept: 'CO', isHOD: false },
      { key: 'staff_co_2', userKey: 'staff_co_2', dept: 'CO', isHOD: false },
      { key: 'staff_co_3', userKey: 'staff_co_3', dept: 'CO', isHOD: false },
      { key: 'staff_it_1', userKey: 'staff_it_1', dept: 'IT', isHOD: false },
      { key: 'staff_it_2', userKey: 'staff_it_2', dept: 'IT', isHOD: false },
      { key: 'staff_extc_1', userKey: 'staff_extc_1', dept: 'EXTC', isHOD: false },
    ];

    for (const profile of staffProfiles) {
      const id = generateId();
      await firestore.collection(COLLECTIONS.STAFF).doc(id).set({
        id,
        userId: ids.users[profile.userKey],
        departmentId: ids.departments[profile.dept],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      ids.staff[profile.key] = id;
      
      // Update department with HOD
      if (profile.isHOD) {
        await firestore.collection(COLLECTIONS.DEPARTMENTS).doc(ids.departments[profile.dept]).update({
          hodId: id,
          updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`  ✓ HOD Staff Profile: ${profile.dept}`);
      } else {
        console.log(`  ✓ Staff Profile: ${profile.key}`);
      }
    }
    console.log('');

    // ============================================
    // 5. SUBJECTS
    // ============================================
    console.log('📖 Creating Subjects...');
    const subjectsData = [
      { code: 'CO201', name: 'Data Structures', year: 'SYCO' },
      { code: 'CO202', name: 'Object Oriented Programming', year: 'SYCO' },
      { code: 'CO203', name: 'Database Management Systems', year: 'SYCO' },
      { code: 'CO204', name: 'Computer Networks', year: 'SYCO' },
      { code: 'CO205', name: 'Operating Systems', year: 'SYCO' },
      { code: 'IT201', name: 'Web Technologies', year: 'SYCO' },
      { code: 'IT202', name: 'Software Engineering', year: 'SYCO' },
      { code: 'IT203', name: 'Mobile Application Development', year: 'SYCO' },
    ];

    for (const subject of subjectsData) {
      const id = generateId();
      await firestore.collection(COLLECTIONS.SUBJECTS).doc(id).set({
        id,
        name: subject.name,
        subjectCode: subject.code,
        academicYearId: ids.academicYears[subject.year],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      ids.subjects[subject.code] = id;
      console.log(`  ✓ ${subject.name} (${subject.code})`);
    }
    console.log('');

    // ============================================
    // 6. FACULTY ASSIGNMENTS
    // ============================================
    console.log('📝 Creating Faculty Assignments...');
    const semester = 'Odd 2025-26';
    const assignmentsData = [
      { staffKey: 'staff_co_1', subjectCode: 'CO201' },
      { staffKey: 'staff_co_2', subjectCode: 'CO202' },
      { staffKey: 'staff_co_3', subjectCode: 'CO203' },
      { staffKey: 'staff_co_1', subjectCode: 'CO204' },
      { staffKey: 'staff_co_2', subjectCode: 'CO205' },
      { staffKey: 'staff_it_1', subjectCode: 'IT201' },
      { staffKey: 'staff_it_2', subjectCode: 'IT202' },
      { staffKey: 'staff_it_1', subjectCode: 'IT203' },
    ];

    for (const assignment of assignmentsData) {
      const id = generateId();
      await firestore.collection(COLLECTIONS.FACULTY_ASSIGNMENTS).doc(id).set({
        id,
        semester,
        staffId: ids.staff[assignment.staffKey],
        subjectId: ids.subjects[assignment.subjectCode],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      ids.assignments[`${assignment.staffKey}_${assignment.subjectCode}`] = id;
      console.log(`  ✓ ${assignment.subjectCode} → ${assignment.staffKey}`);
    }
    console.log('');

    // ============================================
    // 7. FEEDBACK
    // ============================================
    console.log('💬 Creating Feedback Entries...');
    
    const getRandomRating = () => Math.floor(Math.random() * 3) + 3; // 3-5
    const suggestions = [
      'Great teaching! Very helpful and clear explanations.',
      'Excellent knowledge of the subject matter.',
      'Could use more practical examples.',
      'Very supportive and helpful during lab sessions.',
      null,
      null,
    ];

    let feedbackCount = 0;

    // Create feedback for CO department students
    const coStudents = studentUsers.filter(s => s.dept === 'CO').map(s => s.key);
    const coAssignments = assignmentsData.filter(a => a.subjectCode.startsWith('CO'));

    for (const assignment of coAssignments) {
      const assignmentId = ids.assignments[`${assignment.staffKey}_${assignment.subjectCode}`];
      
      // Each student gives feedback
      for (const studentKey of coStudents) {
        const id = generateId();
        await firestore.collection(COLLECTIONS.FEEDBACK).doc(id).set({
          id,
          studentId: ids.users[studentKey],
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
          isReleased: feedbackCount % 5 === 0, // 20% released
          any_suggestion: suggestions[feedbackCount % suggestions.length],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        feedbackCount++;
      }
    }

    // Create feedback for IT department students
    const itStudents = studentUsers.filter(s => s.dept === 'IT').map(s => s.key);
    const itAssignments = assignmentsData.filter(a => a.subjectCode.startsWith('IT'));

    for (const assignment of itAssignments) {
      const assignmentId = ids.assignments[`${assignment.staffKey}_${assignment.subjectCode}`];
      
      for (const studentKey of itStudents) {
        const id = generateId();
        await firestore.collection(COLLECTIONS.FEEDBACK).doc(id).set({
          id,
          studentId: ids.users[studentKey],
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
          isReleased: feedbackCount % 5 === 0,
          any_suggestion: suggestions[feedbackCount % suggestions.length],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        feedbackCount++;
      }
    }
    console.log(`  ✓ Created ${feedbackCount} feedback entries`);
    console.log('');

    // ============================================
    // 8. HOD SUGGESTIONS
    // ============================================
    console.log('💡 Creating HOD Suggestions...');
    const hodSuggestionsData = [
      { 
        staffKey: 'staff_co_1', 
        content: 'Excellent performance in Data Structures and Computer Networks. Students are showing great improvement under your guidance. Keep up the good work!' 
      },
      { 
        staffKey: 'staff_co_2', 
        content: 'Good teaching approach in OOP and OS. Consider adding more hands-on coding exercises to help students grasp complex concepts better.' 
      },
      { 
        staffKey: 'staff_co_3', 
        content: 'Strong command over Database Management Systems. Student feedback has been very positive. Suggest incorporating more real-world case studies.' 
      },
      { 
        staffKey: 'staff_it_1', 
        content: 'Very effective in Web Technologies and Mobile App Development. Your practical approach is highly appreciated by students.' 
      },
      { 
        staffKey: 'staff_it_2', 
        content: 'Solid performance in Software Engineering. The project-based learning approach is working well. Continue this methodology.' 
      },
    ];

    for (const suggestion of hodSuggestionsData) {
      const id = generateId();
      await firestore.collection(COLLECTIONS.HOD_SUGGESTIONS).doc(id).set({
        id,
        staffId: ids.staff[suggestion.staffKey],
        semester,
        content: suggestion.content,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`  ✓ HOD Suggestion for ${suggestion.staffKey}`);
    }
    console.log('');

    // ============================================
    // SUMMARY
    // ============================================
    console.log('✅ DATABASE SEEDING COMPLETED!\n');
    console.log('━'.repeat(60));
    console.log('📊 DATABASE SUMMARY');
    console.log('━'.repeat(60));
    console.log(`  Academic Years:        ${academicYearsData.length}`);
    console.log(`  Departments:           ${departmentsData.length}`);
    console.log(`  Users:                 ${1 + hodUsers.length + staffUsers.length + studentUsers.length}`);
    console.log(`    ├─ Admin:            1`);
    console.log(`    ├─ HODs:             ${hodUsers.length}`);
    console.log(`    ├─ Staff:            ${staffUsers.length}`);
    console.log(`    └─ Students:         ${studentUsers.length}`);
    console.log(`  Staff Profiles:        ${staffProfiles.length}`);
    console.log(`  Subjects:              ${subjectsData.length}`);
    console.log(`  Faculty Assignments:   ${assignmentsData.length}`);
    console.log(`  Feedback Entries:      ${feedbackCount}`);
    console.log(`  HOD Suggestions:       ${hodSuggestionsData.length}`);
    console.log('━'.repeat(60));
    console.log('\n🔑 TEST LOGIN CREDENTIALS');
    console.log('━'.repeat(60));
    console.log('  Admin:');
    console.log('    Email:    admin@spiot.edu');
    console.log('    Password: password123');
    console.log('');
    console.log('  HOD (Computer Engineering):');
    console.log('    Email:    rajesh.kumar@spiot.edu');
    console.log('    Password: password123');
    console.log('');
    console.log('  Staff:');
    console.log('    Email:    suresh.desai@spiot.edu');
    console.log('    Password: password123');
    console.log('');
    console.log('  Student:');
    console.log('    Email:    2023co001@student.spiot.edu');
    console.log('    Password: 2023CO001');
    console.log('━'.repeat(60));

  } catch (error) {
    console.error('\n❌ ERROR DURING SEEDING:', error);
    throw error;
  }
}

seedPrismaStructure()
  .then(() => {
    console.log('\n✨ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
