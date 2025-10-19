import '../src/lib/env-config';
import { PrismaClient } from '@prisma/client';
import { firestore } from '../src/lib/firebase';
import { COLLECTIONS } from '../src/lib/firebase-services';

const prisma = new PrismaClient();

async function migratePrismaToFirebase() {
  console.log('🚀 Starting Prisma to Firebase migration...\n');
  
  try {
    const batch = firestore.batch();
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500;

    const batches: any[] = [];
    let currentBatch = firestore.batch();
    let currentBatchCount = 0;

    const commitBatch = async () => {
      if (currentBatchCount > 0) {
        batches.push(currentBatch);
        currentBatch = firestore.batch();
        currentBatchCount = 0;
      }
    };

    console.log('📊 Step 1: Migrating Academic Years...');
    const academicYears = await prisma.academicYear.findMany();
    console.log(`Found ${academicYears.length} academic years`);
    
    for (const year of academicYears) {
      const docRef = firestore.collection(COLLECTIONS.ACADEMIC_YEARS).doc(year.id);
      currentBatch.set(docRef, {
        name: year.name,
        abbreviation: year.abbreviation,
      });
      currentBatchCount++;
      
      if (currentBatchCount >= MAX_BATCH_SIZE) {
        await commitBatch();
      }
    }
    await commitBatch();

    console.log('🏢 Step 2: Migrating Departments...');
    const departments = await prisma.department.findMany();
    console.log(`Found ${departments.length} departments`);
    
    for (const dept of departments) {
      const docRef = firestore.collection(COLLECTIONS.DEPARTMENTS).doc(dept.id);
      currentBatch.set(docRef, {
        name: dept.name,
        abbreviation: dept.abbreviation,
        isFeedbackActive: dept.isFeedbackActive || false,
        hodId: dept.hodId || null,
      });
      currentBatchCount++;
      
      if (currentBatchCount >= MAX_BATCH_SIZE) {
        await commitBatch();
      }
    }
    await commitBatch();

    console.log('👤 Step 3: Migrating Users...');
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users`);
    
    for (const user of users) {
      const docRef = firestore.collection(COLLECTIONS.USERS).doc(user.id);
      currentBatch.set(docRef, {
        name: user.name || null,
        email: user.email || null,
        hashedPassword: user.hashedPassword || null,
        role: user.role,
        departmentId: user.departmentId || null,
        academicYearId: user.academicYearId || null,
      });
      currentBatchCount++;
      
      if (currentBatchCount >= MAX_BATCH_SIZE) {
        await commitBatch();
      }
    }
    await commitBatch();

    console.log('👨‍🏫 Step 4: Migrating Staff...');
    const staff = await prisma.staff.findMany();
    console.log(`Found ${staff.length} staff members`);
    
    for (const staffMember of staff) {
      const docRef = firestore.collection(COLLECTIONS.STAFF).doc(staffMember.id);
      currentBatch.set(docRef, {
        userId: staffMember.userId,
        departmentId: staffMember.departmentId,
      });
      currentBatchCount++;
      
      if (currentBatchCount >= MAX_BATCH_SIZE) {
        await commitBatch();
      }
    }
    await commitBatch();

    console.log('📚 Step 5: Migrating Subjects...');
    const subjects = await prisma.subject.findMany();
    console.log(`Found ${subjects.length} subjects`);
    
    for (const subject of subjects) {
      const docRef = firestore.collection(COLLECTIONS.SUBJECTS).doc(subject.id);
      currentBatch.set(docRef, {
        name: subject.name,
        subjectCode: subject.subjectCode,
        academicYearId: subject.academicYearId,
      });
      currentBatchCount++;
      
      if (currentBatchCount >= MAX_BATCH_SIZE) {
        await commitBatch();
      }
    }
    await commitBatch();

    console.log('📋 Step 6: Migrating Faculty Assignments...');
    const assignments = await prisma.facultyAssignment.findMany();
    console.log(`Found ${assignments.length} faculty assignments`);
    
    for (const assignment of assignments) {
      const docRef = firestore.collection(COLLECTIONS.FACULTY_ASSIGNMENTS).doc(assignment.id);
      currentBatch.set(docRef, {
        semester: assignment.semester,
        staffId: assignment.staffId,
        subjectId: assignment.subjectId,
      });
      currentBatchCount++;
      
      if (currentBatchCount >= MAX_BATCH_SIZE) {
        await commitBatch();
      }
    }
    await commitBatch();

    console.log('📝 Step 7: Migrating Feedback...');
    const feedbacks = await prisma.feedback.findMany();
    console.log(`Found ${feedbacks.length} feedback submissions`);
    
    for (const feedback of feedbacks) {
      const docRef = firestore.collection(COLLECTIONS.FEEDBACK).doc(feedback.id);
      currentBatch.set(docRef, {
        studentId: feedback.studentId,
        assignmentId: feedback.assignmentId,
        createdAt: feedback.createdAt,
        coverage_of_syllabus: feedback.coverage_of_syllabus,
        covering_relevant_topics_beyond_syllabus: feedback.covering_relevant_topics_beyond_syllabus,
        effectiveness_technical_contents: feedback.effectiveness_technical_contents,
        effectiveness_communication_skills: feedback.effectiveness_communication_skills,
        effectiveness_teaching_aids: feedback.effectiveness_teaching_aids,
        motivation_self_learning: feedback.motivation_self_learning,
        support_practical_performance: feedback.support_practical_performance,
        support_project_seminar: feedback.support_project_seminar,
        feedback_on_student_progress: feedback.feedback_on_student_progress,
        punctuality_and_discipline: feedback.punctuality_and_discipline,
        domain_knowledge: feedback.domain_knowledge,
        interaction_with_students: feedback.interaction_with_students,
        ability_to_resolve_difficulties: feedback.ability_to_resolve_difficulties,
        encourage_cocurricular: feedback.encourage_cocurricular,
        encourage_extracurricular: feedback.encourage_extracurricular,
        guidance_during_internship: feedback.guidance_during_internship,
        isReleased: feedback.isReleased,
        any_suggestion: feedback.any_suggestion || null,
      });
      currentBatchCount++;
      
      if (currentBatchCount >= MAX_BATCH_SIZE) {
        await commitBatch();
      }
    }
    await commitBatch();

    console.log('💡 Step 8: Migrating HOD Suggestions...');
    const hodSuggestions = await prisma.hodSuggestion.findMany();
    console.log(`Found ${hodSuggestions.length} HOD suggestions`);
    
    for (const suggestion of hodSuggestions) {
      const docRef = firestore.collection(COLLECTIONS.HOD_SUGGESTIONS).doc(suggestion.id);
      currentBatch.set(docRef, {
        staffId: suggestion.staffId,
        semester: suggestion.semester,
        content: suggestion.content,
        createdAt: suggestion.createdAt,
        updatedAt: suggestion.updatedAt,
      });
      currentBatchCount++;
      
      if (currentBatchCount >= MAX_BATCH_SIZE) {
        await commitBatch();
      }
    }
    await commitBatch();

    console.log('\n🔥 Committing all batches to Firestore...');
    for (const batch of batches) {
      await batch.commit();
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Academic Years: ${academicYears.length}`);
    console.log(`  - Departments: ${departments.length}`);
    console.log(`  - Users: ${users.length}`);
    console.log(`  - Staff: ${staff.length}`);
    console.log(`  - Subjects: ${subjects.length}`);
    console.log(`  - Faculty Assignments: ${assignments.length}`);
    console.log(`  - Feedback: ${feedbacks.length}`);
    console.log(`  - HOD Suggestions: ${hodSuggestions.length}`);
    console.log(`\n🎉 All data has been migrated from Prisma to Firebase!\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migratePrismaToFirebase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
