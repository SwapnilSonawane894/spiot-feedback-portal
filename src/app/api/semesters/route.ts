import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { assignmentService, semesterSettingsService, normalizeSemester } from "@/lib/mongodb-services";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get current semester setting and history
    const settings = await semesterSettingsService.get();
    const currentSemester = semesterSettingsService.getCurrentSemesterString(
      settings.currentSemester,
      settings.academicYear
    );
    const semesterHistory = settings.semesterHistory || [];

    // Combine: semester history from settings + unique semesters from assignments
    const semesterSet = new Set<string>();
    
    // Add from saved history first
    for (const semester of semesterHistory) {
      const normalized = normalizeSemester(semester);
      if (normalized) {
        semesterSet.add(normalized);
      }
    }

    // Also get semesters from assignments (in case some weren't in history)
    const allAssignments = await assignmentService.findMany({});
    for (const assignment of allAssignments) {
      if (assignment.semester) {
        const normalized = normalizeSemester(assignment.semester);
        if (normalized) {
          semesterSet.add(normalized);
        }
      }
    }

    // Add current semester if not in list (normalized)
    if (currentSemester) {
      const normalizedCurrent = normalizeSemester(currentSemester);
      if (normalizedCurrent) {
        semesterSet.add(normalizedCurrent);
      }
    }

    // Convert to array and sort (most recent first)
    const semesters = Array.from(semesterSet).sort((a, b) => {
      // Parse semester strings like "Odd 2025-26" or "Even 2024-25"
      const parseYear = (s: string) => {
        const match = s.match(/(\d{4})-(\d{2})/);
        if (match) return parseInt(match[1]);
        return 0;
      };
      const isOdd = (s: string) => s.toLowerCase().includes('odd');
      
      const yearA = parseYear(a);
      const yearB = parseYear(b);
      
      if (yearA !== yearB) return yearB - yearA; // Higher year first
      
      // Same year: Even comes after Odd in academic year, so Even should be first when sorting desc
      if (isOdd(a) && !isOdd(b)) return 1;
      if (!isOdd(a) && isOdd(b)) return -1;
      
      return 0;
    });

    // Return normalized current semester
    const normalizedCurrentSemester = currentSemester ? normalizeSemester(currentSemester) : (semesters[0] || '');

    return NextResponse.json({ 
      semesters, 
      currentSemester: normalizedCurrentSemester 
    });
  } catch (error) {
    // console.error(error);
    return NextResponse.json({ error: "Failed to fetch semesters" }, { status: 500 });
  }
}
