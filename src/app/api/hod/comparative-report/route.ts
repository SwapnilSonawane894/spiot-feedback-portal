/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { staffService, assignmentService } from "@/lib/firebase-services";
import ExcelJS from "exceljs";

const PARAM_KEYS = [
  "coverage_of_syllabus",
  "covering_relevant_topics_beyond_syllabus",
  "effectiveness_technical_contents",
  "effectiveness_communication_skills",
  "effectiveness_teaching_aids",
  "motivation_self_learning",
  "support_practical_performance",
  "support_project_seminar",
  "feedback_on_student_progress",
  "punctuality_and_discipline",
  "domain_knowledge",
  "interaction_with_students",
  "ability_to_resolve_difficulties",
  "encourage_cocurricular",
  "encourage_extracurricular",
  "guidance_during_internship",
];

const PARAM_LABELS: Record<string, string> = {
  coverage_of_syllabus: "Coverage of syllabus",
  covering_relevant_topics_beyond_syllabus: "Covering relevant topics beyond the syllabus",
  effectiveness_technical_contents: "Effectiveness (technical contents)",
  effectiveness_communication_skills: "Effectiveness (communication skills)",
  effectiveness_teaching_aids: "Effectiveness (teaching aids)",
  motivation_self_learning: "Motivation / self-learning",
  support_practical_performance: "Support - practical performance",
  support_project_seminar: "Support - project & seminar",
  feedback_on_student_progress: "Feedback on student progress",
  punctuality_and_discipline: "Punctuality & discipline",
  domain_knowledge: "Domain knowledge",
  interaction_with_students: "Interaction with students",
  ability_to_resolve_difficulties: "Ability to resolve difficulties",
  encourage_cocurricular: "Encourage cocurricular",
  encourage_extracurricular: "Encourage extracurricular",
  guidance_during_internship: "Guidance during internship",
};

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "HOD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const yearId = url.searchParams.get("year");
    if (!yearId) return NextResponse.json({ error: "Missing academicYearId (year) query param" }, { status: 400 });

    // find department for HOD
    const hodStaff = await staffService.findUnique({ where: { userId: session.user.id } });
    if (!hodStaff || !hodStaff.departmentId) return NextResponse.json({ error: "HOD or department not found" }, { status: 404 });
    const departmentId = hodStaff.departmentId;

    // fetch staff in department with assignments for the requested academic year
    const staffs = await staffService.findMany({
      where: { departmentId },
      include: {
        user: true,
        assignments: {
          where: { subject: { academicYearId: yearId } },
          include: { subject: true, feedbacks: true },
        },
      },
      orderBy: { id: "asc" },
    });

    // Build ordered list of staff with their assignments
    const matrixStaffs: any[] = staffs
      .map((s) => ({
        staffId: s.id,
        staffName: s.user?.name || s.user?.email || "Unknown",
        assignments: (s.assignments || []).map((a: any) => ({
          assignmentId: a.id,
          semester: a.semester,
          subject: { id: a.subject.id, name: a.subject.name },
          feedbacks: a.feedbacks || [],
        })),
      }))
      .filter((s) => s.assignments && s.assignments.length > 0);

    // Build Excel workbook
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Comparative Report");

    // Header construction
    // Row 1: Staff header (Parameter | Staff1 merged across their subjects | Staff2 ...)
    // Row 2: Subject header (empty | subj1 | subj2 | subj3 ...)

    const headerStaffRow: any[] = ["Parameter"];
    const headerSubjectRow: any[] = [""];

    // track column positions for merges and data mapping
    const subjectColumns: { staffId: string; staffName: string; subjectId: string; subjectName: string }[] = [];

    for (const s of matrixStaffs) {
      const subjCount = s.assignments.length;
      for (const a of s.assignments) {
        headerStaffRow.push(s.staffName);
        headerSubjectRow.push(a.subject.name);
        subjectColumns.push({ staffId: s.staffId, staffName: s.staffName, subjectId: a.subject.id, subjectName: a.subject.name });
      }
    }

    ws.addRow(headerStaffRow);
    ws.addRow(headerSubjectRow);

    // Merge staff header cells: starting from column 2
    let colIndex = 2;
    for (const s of matrixStaffs) {
      const span = s.assignments.length;
      if (span > 1) {
        ws.mergeCells(1, colIndex, 1, colIndex + span - 1);
      }
      colIndex += span;
    }

    // Style header rows (bold + fill)
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } } as any;
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).eachCell((cell) => (cell.fill = headerFill));
    ws.getRow(2).font = { bold: true };
    ws.getRow(2).eachCell((cell) => (cell.fill = headerFill));

    // Prepare flatAssignments order from subjectColumns
    const flatAssignments = subjectColumns.map((col) => {
      // find the assignment object
      const staff = matrixStaffs.find((s) => s.staffId === col.staffId);
      const assignment = staff.assignments.find((a: any) => a.subject.id === col.subjectId);
      return { ...assignment, staffName: staff.staffName };
    });

    // Compute per-assignment per-parameter averages
    for (const a of flatAssignments) {
      const feedbacks = a.feedbacks || [];
      const averages: Record<string, number | null> = {};
      if (feedbacks.length === 0) {
        PARAM_KEYS.forEach((k) => (averages[k] = null));
      } else {
        for (const k of PARAM_KEYS) {
          let sum = 0;
          for (const f of feedbacks) {
            const v = Number((f as any)[k]);
            sum += Number.isFinite(v) ? v : 0;
          }
          averages[k] = parseFloat((sum / feedbacks.length).toFixed(2));
        }
      }
      a.averages = averages;
      console.log(`Assignment ${a.assignmentId} (${a.subject.name}) averages:`, averages);
    }

    // Add 16 parameter rows starting at row 3
    for (const key of PARAM_KEYS) {
      const row: (string | number)[] = [PARAM_LABELS[key] || key];
      for (const a of flatAssignments) {
        const v = a.averages && typeof a.averages[key] === 'number' ? a.averages[key] : null;
        row.push(v === null ? '' : v);
      }
      ws.addRow(row);
    }

    // Summary rows
    const totals: number[] = [];
    const marks25: number[] = [];
    const avgParams: number[] = [];

    for (const a of flatAssignments) {
      let total = 0;
      for (const k of PARAM_KEYS) {
        const v = a.averages && typeof a.averages[k] === 'number' ? a.averages[k] : 0;
        total += v;
      }
      const marksOut = (total / (PARAM_KEYS.length * 5)) * 25;
      const avgParam = PARAM_KEYS.length ? total / PARAM_KEYS.length : 0;

      totals.push(parseFloat(total.toFixed(2)));
      marks25.push(parseFloat(marksOut.toFixed(2)));
      avgParams.push(parseFloat(avgParam.toFixed(2)));

      console.log(`Assignment ${a.assignmentId} totals: total=${total.toFixed(2)}, marks25=${marksOut.toFixed(2)}, avgParam=${avgParam.toFixed(2)}`);
    }

    const totalRow = ["TOTAL MARKS (out of 80)", ...totals];
    const marks25Row = ["MARKS OUT OF 25", ...marks25];
    const avgRow = ["Average Parameter Score (out of 5)", ...avgParams];

    const rTotal = ws.addRow(totalRow);
    const rMarks = ws.addRow(marks25Row);
    const rAvg = ws.addRow(avgRow);

    // Style summary rows
    rTotal.getCell(1).font = { bold: true };
    rMarks.getCell(1).font = { bold: true };
    rAvg.getCell(1).font = { bold: true };
    rTotal.eachCell((cell) => {
      const existing = (cell.border as any) || {};
      cell.border = { ...existing, top: { style: 'thin' } } as any;
    });

    // Format summary numeric cells
    const colCount = 1 + flatAssignments.length;
    for (let c = 2; c <= colCount; c++) {
      const ct = rTotal.getCell(c);
      if (typeof ct.value === 'number') ct.numFmt = '0.00';
      const cm = rMarks.getCell(c);
      if (typeof cm.value === 'number') cm.numFmt = '0.00';
      const ca = rAvg.getCell(c);
      if (typeof ca.value === 'number') ca.numFmt = '0.00';
    }

    // Column widths
    ws.getColumn(1).width = 40;
    for (let c = 2; c <= colCount; c++) ws.getColumn(c).width = 20;

    // Freeze top 2 rows and first column
    ws.views = [{ state: 'frozen', ySplit: 2, xSplit: 1 }];

    // Add a second worksheet for qualitative suggestions/comments
    const commentsSheet = workbook.addWorksheet('Suggestions');
    commentsSheet.addRow(['Faculty Name', 'Subject', 'Suggestion']);
    for (const s of matrixStaffs) {
      for (const a of s.assignments) {
        const feedbacks = a.feedbacks || [];
        for (const f of feedbacks) {
          const text = (f as any).any_suggestion;
          if (text && typeof text === 'string' && text.trim().length > 0) {
            commentsSheet.addRow([s.staffName, a.subject.name, text.trim()]);
          }
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Feedback-Report.xlsx"',
      },
    });
  } catch (error) {
    console.error('comparative-report error', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

function computeAverages(feedbacks: any[]) {
  const totals: any = {};
  PARAM_KEYS.forEach((k) => (totals[k] = 0));
  if (!feedbacks || feedbacks.length === 0) {
    return PARAM_KEYS.reduce((acc: any, k) => ({ ...acc, [k]: null }), {});
  }
  for (const f of feedbacks) {
    PARAM_KEYS.forEach((k) => {
      totals[k] += Number((f as any)[k] ?? 0);
    });
  }
  const avg: any = {};
  PARAM_KEYS.forEach((k) => {
    avg[k] = parseFloat((totals[k] / feedbacks.length).toFixed(2));
  });
  return avg;
}
