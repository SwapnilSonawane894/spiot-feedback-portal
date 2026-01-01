/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, feedbackService, userService, subjectService, getStudentTasksFromDb } from "@/lib/mongodb-services";

// Parameter labels for display
const paramLabels: Record<string, string> = {
  coverage_of_syllabus: "Coverage of Syllabus",
  covering_relevant_topics_beyond_syllabus: "Covering Relevant Topics Beyond Syllabus",
  effectiveness_technical_contents: "Effectiveness (Technical Contents)",
  effectiveness_communication_skills: "Effectiveness (Communication Skills)",
  effectiveness_teaching_aids: "Effectiveness (Teaching Aids)",
  motivation_self_learning: "Motivation / Self-learning",
  support_practical_performance: "Support - Practical Performance",
  support_project_seminar: "Support - Project & Seminar",
  feedback_on_student_progress: "Feedback on Student Progress",
  punctuality_and_discipline: "Punctuality & Discipline",
  domain_knowledge: "Domain Knowledge",
  interaction_with_students: "Interaction with Students",
  ability_to_resolve_difficulties: "Ability to Resolve Difficulties",
  encourage_cocurricular: "Encourage Co-curricular",
  encourage_extracurricular: "Encourage Extra-curricular",
  guidance_during_internship: "Guidance During Internship",
};

export async function GET(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const studentId = url.searchParams.get("studentId");
    
    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    // Get HOD's department
    const hodProfile = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!hodProfile) {
      return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });
    }

    // Get student details
    const student = await userService.findUnique({ id: studentId });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Verify student is in HOD's department
    if (student.departmentId !== hodProfile.departmentId) {
      return NextResponse.json({ error: "Student not in your department" }, { status: 403 });
    }

    // Get student's tasks/feedback
    const tasks = await getStudentTasksFromDb(studentId, { useCache: false });

    // Get detailed feedback for each task
    const feedbackDetails = await Promise.all(tasks.map(async (task: any) => {
      // Get feedback if completed
      const feedback = task.status === 'Completed' 
        ? await feedbackService.findFirst({ studentId, assignmentId: task.assignmentId })
        : null;

      // Get subject info from the task or fetch if needed
      let subjectName = task.subjectName || 'Unknown Subject';
      let subjectCode = '';
      if (task.subjectId) {
        const subject = await subjectService.findUnique({ id: task.subjectId });
        if (subject) {
          subjectName = subject.name;
          subjectCode = subject.subjectCode || '';
        }
      }

      // Faculty name is already in the task
      const facultyName = task.facultyName || 'Unknown Faculty';

      // Build ratings array from feedback
      const ratings: { param: string; label: string; value: number }[] = [];
      if (feedback) {
        Object.keys(paramLabels).forEach(key => {
          if (feedback[key] !== undefined) {
            ratings.push({
              param: key,
              label: paramLabels[key],
              value: feedback[key],
            });
          }
        });
      }

      return {
        assignmentId: task.assignmentId,
        subjectName,
        subjectCode,
        facultyName,
        status: task.status,
        ratings,
        suggestion: feedback?.any_suggestion || null,
        submittedAt: feedback?.createdAt || null,
      };
    }));

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
      },
      feedbacks: feedbackDetails,
    });
  } catch (error) {
    // console.error("Error fetching student feedback:", error);
    return NextResponse.json({ error: "Failed to fetch student feedback" }, { status: 500 });
  }
}
