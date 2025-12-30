import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, assignmentService, hodSuggestionService } from "@/lib/mongodb-services";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

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

const paramLabels: Record<string,string> = {
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

export async function GET(req: Request, ctx: { params?: any }) {
  try {
    // Next.js requires awaiting params for dynamic API routes
    const routeParams = await ctx?.params;
    const staffId = routeParams?.staffId || new URL(req.url).pathname.split('/').slice(-2)[0];
    if (!staffId) return NextResponse.json({ error: 'staffId required' }, { status: 400 });

    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // allow HODs or the staff member themselves
  const staff = await staffService.findUnique({ where: { id: staffId }, include: { user: true } });
    if (!staff) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });

  // Accept both STAFF and FACULTY roles for faculty users
  const viewerRole = session.user?.role;
  const viewerId = session.user?.id;
  const viewerIsHod = viewerRole === 'HOD';
  const viewerIsSelf = (viewerRole === 'STAFF' || viewerRole === 'FACULTY') && viewerId === staff.userId;
  const allowed = viewerIsHod || viewerIsSelf;
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // fetch assignments (subject) then fetch feedbacks explicitly so we always get the latest feedback docs
    // Scope assignments by department depending on viewer: HOD sees assignments for their department, staff sees assignments for their own department
    let deptFilter: any = {};
    if (viewerIsHod) {
      const hodProfile = await (await import('@/lib/mongodb-services')).staffService.findUnique({ where: { userId: viewerId } });
      if (hodProfile && hodProfile.departmentId) deptFilter.departmentId = hodProfile.departmentId;
    } else if (viewerIsSelf) {
      if (staff.departmentId) deptFilter.departmentId = staff.departmentId;
    }

    const assignments = await assignmentService.findMany({ where: { staffId, ...deptFilter }, include: { subject: true } });

    // debug mode: return diagnostics instead of binary PDF
    const url = new URL(req.url);
    const debugMode = url.searchParams.get('debug') === '1';
    if (debugMode) {
      // compute counts
      const fbService = (await import('@/lib/mongodb-services')).feedbackService;
      const counts = [] as any[];
      for (const a of assignments) {
        const fbWhere: any = { assignmentId: a.id };
        if (session.user?.role !== 'HOD') fbWhere.isReleased = true;
        const fbs = await fbService.findMany({ where: fbWhere });
        counts.push({ assignmentId: a.id, subject: a.subject?.name, feedbackCount: (fbs || []).length });
      }
      return NextResponse.json({ success: true, staffId, viewerRole: session.user?.role, allowed: allowed, assignmentCount: assignments.length, counts });
    }

  // determine semester (best-effort: use first assignment.semester) and fetch the single HOD suggestion for it
  const semester = assignments?.[0]?.semester || '';
  const hodSuggestion = await hodSuggestionService.findUnique({ staffId_semester: { staffId, semester } });

    // prepare data
    const reports: any[] = [];
    // Student suggestions removed from PDF - only HOD can see them

    for (const a of assignments) {
      const fbService = (await import('@/lib/mongodb-services')).feedbackService;
      const fbWhere: any = { assignmentId: a.id };
      // If the viewer is not an HOD, only include feedbacks that HOD has released
      if (!viewerIsHod) fbWhere.isReleased = true;
      const feedbacks = await fbService.findMany({ where: fbWhere });
      if (!feedbacks || feedbacks.length === 0) continue;
      const avg: Record<string, number> = {};
      PARAM_KEYS.forEach((p: string) => (avg[p] = 0));
      for (const f of feedbacks) {
        PARAM_KEYS.forEach((p: string) => (avg[p] += Number((f as any)[p] ?? 0)));
        // Student suggestions no longer collected for PDF
      }
      PARAM_KEYS.forEach((p: string) => (avg[p] = parseFloat((avg[p] / feedbacks.length).toFixed(2))));
      const total = PARAM_KEYS.reduce((s: number, k: string) => s + (Number(avg[k]) || 0), 0);
      const overallPercentage = parseFloat(((total / (PARAM_KEYS.length * 5)) * 100).toFixed(2));
      reports.push({ assignmentId: a.id, subject: a.subject, semester: a.semester, averages: avg, totalResponses: feedbacks.length, overallPercentage });
    }

    // generate PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4 in points (72dpi) approximately
    const times = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSizeTitle = 16;
    const fontSizeNormal = 10;

  // header area (centered title + faculty name + academic year)
  let y = page.getHeight() - 60;
  const pageCenter = page.getWidth() / 2;
  page.drawText('Student Feedback Analysis', { x: pageCenter - 110, y, size: 18, font: times, color: rgb(0,0,0) });
  y -= 20;
  // only show centered title; staff name and academic year will appear once below in left column
  y -= 10;

  // Two-column info area: left = staff / academic year, right = subjects
  const pageWidth = page.getWidth();
  const leftX = 40;
  const rightX = pageWidth / 2 + 10;
  // print staff name + academic year in the left column (per option B)
  page.drawText(`Name of staff: ${staff.user?.name || 'Faculty'}`, { x: leftX, y, size: 10, font: times });
  page.drawText(`Academic Year / Semester: ${semester}`, { x: leftX, y: y - 14, size: 10, font: times });
  const subjects = reports.map(r => r.subject?.name).filter(Boolean).join(', ');
  
  // Wrap subjects if too long
  const subjectsWrapped = wrapPdfText(`Subjects: ${subjects}`, pageWidth - rightX - 40, times, 10);
  for (let i = 0; i < subjectsWrapped.length; i++) {
    page.drawText(subjectsWrapped[i], { x: rightX, y: y - (i * 14), size: 10, font: times });
  }
  y -= 38;

  // Add introductory paragraph
  const introParagraph = "This is informed to you,as per student Feedback Analysis & student performance report you are requested to correct your deficiencies and give the submit the action for those points to the Department based on the feedback.";
  const introWrapped = wrapPdfText(introParagraph, pageWidth - 80, times, 10);
  for (const line of introWrapped) {
    page.drawText(line, { x: leftX, y, size: 10, font: times });
    y -= 14;
    if (y < 60) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = page.getHeight() - 40;
    }
  }
  y -= 10;

    // draw table as a full bordered grid
    const tableX = 40;
    const tableRight = pageWidth - 40;
    const tableYStart = y;
  const col1Width = 80; // Sr.No. + Parameter label column combined will occupy first part; we'll draw Sr.No. and Parameter inside
  const paramLabelWidth = 220; // width for the parameter label
  const firstColTotal = col1Width + paramLabelWidth;
  const remainingWidth = tableRight - tableX - firstColTotal;
  const colCount = Math.max(1, reports.length);
  const colWidth = remainingWidth / colCount;
    const rowHeight = 20;

    // Prepare wrapped subject headers so they don't overlap; measure using embedded font
    const headerFontSize = 10;
    const maxHeaderWidth = colWidth - 12; // padding inside column
    
    // Helper to strip emojis, newlines, and other non-WinAnsi characters that pdf-lib cannot encode
    function stripEmojis(text: string): string {
      if (!text) return '';
      // Remove emojis, newlines, and other non-ASCII/non-Latin1 characters that WinAnsi cannot encode
      return text
        .replace(/[\r\n\t]/g, ' ')             // Replace newlines and tabs with spaces
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emojis and symbols
        .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Miscellaneous symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
        .replace(/[\u{1F000}-\u{1F02F}]/gu, '') // Mahjong tiles
        .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '') // Playing cards
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation selectors
        .replace(/[\u{200D}]/gu, '')            // Zero width joiner
        .replace(/[^\x20-\xFF]/g, '')           // Remove any remaining non-printable or non-Latin1 characters (keep space 0x20 and above)
        .replace(/\s+/g, ' ')                   // Collapse multiple spaces into one
        .trim();
    }
    
    function wrapPdfText(text: string, maxW: number, font: any, size: number) {
      if (!text) return [''];
      // Strip emojis before processing to avoid WinAnsi encoding errors
      const sanitizedText = stripEmojis(text);
      if (!sanitizedText) return [''];
      const words = sanitizedText.split(' ');
      const lines: string[] = [];
      let cur = '';
      for (const w of words) {
        const trial = (cur ? cur + ' ' + w : w);
        const wWidth = font.widthOfTextAtSize(trial, size);
        if (wWidth > maxW) {
          if (cur) lines.push(cur);
          cur = w;
        } else {
          cur = trial;
        }
      }
      if (cur) lines.push(cur);
      return lines;
    }

    const wrappedHeaders: string[][] = [];
    let maxHeaderLines = 1;
    const lineSpacing = 2;
    const headerPaddingTop = 6;
    const headerPaddingBottom = 4;
    let requiredHeaderHeight = 0;
    for (let idx = 0; idx < colCount; idx++) {
      const subj = (reports[idx] && reports[idx].subject && reports[idx].subject.name) || '';
      const lines = wrapPdfText(String(subj), maxHeaderWidth, times, headerFontSize);
      wrappedHeaders.push(lines);
      if (lines.length > maxHeaderLines) maxHeaderLines = lines.length;
      const totalTextHeight = lines.length * (headerFontSize + lineSpacing);
      const colRequired = totalTextHeight + headerPaddingTop + headerPaddingBottom;
      if (colRequired > requiredHeaderHeight) requiredHeaderHeight = colRequired;
    }

    const headerRowHeight = Math.max(rowHeight, requiredHeaderHeight);
    const overallRowHeight = rowHeight;
    const totalRows = 1 + PARAM_KEYS.length + 1; // header + params + overall
    const tableHeight = headerRowHeight + PARAM_KEYS.length * rowHeight + overallRowHeight;

    // Draw horizontal grid lines: iterate over rows heights
    let gridY = tableYStart;
    // top line
    page.drawLine({ start: { x: tableX, y: gridY }, end: { x: tableRight, y: gridY }, thickness: 0.7, color: rgb(0,0,0) });
    // header bottom
    gridY -= headerRowHeight;
    page.drawLine({ start: { x: tableX, y: gridY }, end: { x: tableRight, y: gridY }, thickness: 0.7, color: rgb(0,0,0) });
    // param rows
    for (let i = 0; i < PARAM_KEYS.length; i++) {
      gridY -= rowHeight;
      page.drawLine({ start: { x: tableX, y: gridY }, end: { x: tableRight, y: gridY }, thickness: 0.7, color: rgb(0,0,0) });
    }
    // overall bottom
    gridY -= overallRowHeight;
    page.drawLine({ start: { x: tableX, y: gridY }, end: { x: tableRight, y: gridY }, thickness: 0.7, color: rgb(0,0,0) });

    // Draw vertical grid lines
    // leftmost at tableX
    page.drawLine({ start: { x: tableX, y: tableYStart }, end: { x: tableX, y: tableYStart - tableHeight }, thickness: 0.7, color: rgb(0,0,0) });
    // vertical line between Sr. No. and Parameter columns
    const srNoColRight = tableX + col1Width;
    page.drawLine({ start: { x: srNoColRight, y: tableYStart }, end: { x: srNoColRight, y: tableYStart - tableHeight }, thickness: 0.7, color: rgb(0,0,0) });
    // vertical line after Parameter column
    const firstColRight = tableX + firstColTotal;
    page.drawLine({ start: { x: firstColRight, y: tableYStart }, end: { x: firstColRight, y: tableYStart - tableHeight }, thickness: 0.7, color: rgb(0,0,0) });
    for (let c = 0; c < colCount; c++) {
      const x = firstColRight + (c + 1) * colWidth;
      page.drawLine({ start: { x, y: tableYStart }, end: { x, y: tableYStart - tableHeight }, thickness: 0.7, color: rgb(0,0,0) });
    }

    // Header texts: Sr. No., Parameter, and wrapped subject headers centered within each column
    // Header top Y is the table top (tableYStart). Anchor text below top border with padding.
    const headerTopY = tableYStart;
    const headerStartBaselineY = headerTopY - headerPaddingTop - headerFontSize; // first line baseline
    // draw Sr. No. and Parameter labels using headerStartBaselineY
    page.drawText('Sr. No.', { x: tableX + 6, y: headerStartBaselineY, size: headerFontSize, font: times });
    page.drawText('Parameter', { x: tableX + col1Width + 6, y: headerStartBaselineY, size: headerFontSize, font: times });
    for (let idx = 0; idx < colCount; idx++) {
      const x = firstColRight + idx * colWidth;
      const lines = wrappedHeaders[idx] || [''];
      // draw each line from top to bottom, spaced by headerFontSize+lineSpacing
      for (let li = 0; li < lines.length; li++) {
        const text = lines[li] || '';
        const textY = headerStartBaselineY - li * (headerFontSize + lineSpacing);
        page.drawText(text, { x: x + 6, y: textY, size: headerFontSize, font: times });
      }
    }

    // Fill parameter rows
    // Fill parameter rows (compute their top positions considering headerRowHeight)
    for (let i = 0; i < PARAM_KEYS.length; i++) {
      const p = PARAM_KEYS[i];
      const rowTop = tableYStart - headerRowHeight - (i * rowHeight) - 0;
      // parameter label
      page.drawText(String(i + 1), { x: tableX + 6, y: rowTop - 12, size: 9, font: times });
      page.drawText(paramLabels[p] || p, { x: tableX + col1Width + 6, y: rowTop - 12, size: 9, font: times });
      // values
      reports.forEach((r: any, idx: number) => {
        const x = firstColRight + idx * colWidth;
        const text = String(r.averages?.[p] ?? '0');
        page.drawText(text, { x: x + 6, y: rowTop - 12, size: 9, font: times });
      });
    }

    // Overall Performance row (last row index = PARAM_KEYS.length)
  const overallRowTop = tableYStart - headerRowHeight - (PARAM_KEYS.length * rowHeight);
  // Overall performance row (no fill, only text and grid lines already drawn)
  page.drawText('Overall Performance', { x: tableX + col1Width + 6, y: overallRowTop - 12, size: 10, font: times });
    reports.forEach((r: any, idx: number) => {
      const x = firstColRight + idx * colWidth;
      page.drawText(`${Number(r.overallPercentage ?? 0).toFixed(2)}%`, { x: x + 6, y: overallRowTop - 12, size: 10, font: times });
    });

    y = tableYStart - tableHeight - 18;

    // Student suggestions removed from PDF - only HOD can see them through the dashboard

    y -= 8;
    // Space before HOD suggestion
    page.drawText('HOD Suggestions:', { x: tableX, y, size: 11, font: times });
    y -= 14;
    const hs = hodSuggestion;
    if (hs && hs.content) {
      // show semester label then the single suggestion content
      page.drawText(`Semester: ${hs.semester}`, { x: tableX + 4, y, size: 9, font: times, color: rgb(0.2,0.2,0.2) });
      y -= 12;
      const wrapped = wrapPdfText(hs.content || '', pageWidth - 100, times, 10);
      for (const line of wrapped) {
        page.drawText(line, { x: tableX + 6, y, size: 10, font: times });
        y -= 14;
        if (y < 60) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = page.getHeight() - 40;
        }
      }
    } else {
      page.drawText('No suggestions from HOD yet.', { x: tableX + 6, y, size: 9, font: times });
    }

  // serialize
  const pdfBytes = await pdfDoc.save();
  // pdfBytes is a Uint8Array; use its underlying ArrayBuffer for Response
  const arrayBuffer = pdfBytes.buffer as ArrayBuffer;
  const contentLength = (pdfBytes && pdfBytes.length) ? String(pdfBytes.length) : undefined;
  const headers: any = { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="faculty-report-${staff.user?.name || staffId}.pdf"`, 'Cache-Control': 'no-store' };
  if (contentLength) headers['Content-Length'] = contentLength;
  return new Response(arrayBuffer, { status: 200, headers });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

