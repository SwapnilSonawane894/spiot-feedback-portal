// Auto-generated replacement for getStudentTasksFromDb
// Generated to fix academicYear handling in student tasks

import { MongoClient, ObjectId } from 'mongodb';
import { getDatabase } from './mongodb';
import { CACHE_KEYS, getCacheKey, getCachedOrFetch, invalidateCache } from './cache-utils';
import { departmentSubjectsService } from './mongodb-services';

// Export the wrapper function that uses caching
export async function getStudentTasksFromDb(userId: string, options?: { groupBySubject?: boolean; allowAcademicYearFallback?: boolean; useCache?: boolean }) {
  // Default to allowing academic year fallback
  options = { allowAcademicYearFallback: true, ...options };
  const cacheKey = getCacheKey(CACHE_KEYS.STUDENT_TASKS, userId);
  
  if (options?.useCache !== false) {
    const cachedTasks = await getCachedOrFetch(cacheKey, async () => {
      return await _fetchStudentTasks(userId, options);
    });
    return cachedTasks;
  }

  return await _fetchStudentTasks(userId, options);
}

// Internal function that does the actual task fetching
async function _fetchStudentTasks(userId: string, options?: { groupBySubject?: boolean; allowAcademicYearFallback?: boolean }) {
  try {
    const db = await getDatabase();
    // 1. Fetch the student record.
    const student = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    if (!student || !student.departmentId || !student.academicYearId) {
      console.error(`getStudentTasksFromDb: Student ${userId} lacks required fields.`);
      return [];
    }
    
    const studentDepartmentIdStr = student.departmentId.toString();
    const studentAcademicYearIdStr = student.academicYearId.toString();

    // Use the departmentSubjectsService which enriches junction rows with master subject
    // and an `academicYear` field (it falls back to the subject's academicYear when the
    // junction lacks one). This produces a more accurate picture of which subjects
    // apply to the student's academic year.
    const deptRows = await departmentSubjectsService.findSubjectsForDepartment(studentDepartmentIdStr, { include: { academicYear: true } });

    if (!deptRows || deptRows.length === 0) {
      console.log(`No department-subject junction rows found for department ${studentDepartmentIdStr}`);
      return [];
    }

    // Build two sets of subject ids:
    // - subjectIdsForYear: those deptRows whose enriched academicYear matches the student's academicYear
    // - subjectIdsAll: all subjects for the department (used as fallback)
    const subjectIdsForYear: string[] = [];
    const subjectIdsAllSet = new Set<string>();
    for (const row of deptRows) {
      // Skip null rows
      if (!row || !row.id) continue;
      
      // Add to all subjects set
      subjectIdsAllSet.add(String(row.id));

      // Check academic year match
      const rowAyId = row.academicYear?.id ? String(row.academicYear.id) : null;
      const junctionAyId = row.junctionAcademicYearId ? String(row.junctionAcademicYearId) : null;
      
      // Add to year-specific list if:
      // 1. Junction row has no academic year (considered valid for all years)
      // 2. Junction academic year matches student's year
      // 3. Subject's academic year matches student's year (when junction has no year)
      if (!junctionAyId || 
          junctionAyId === studentAcademicYearIdStr ||
          (!junctionAyId && rowAyId === studentAcademicYearIdStr)) {
        subjectIdsForYear.push(String(row.id));
      }
    }    
    const subjectIdsAll = Array.from(subjectIdsAllSet);

    // Build query values (string + ObjectId forms) for the full subject list (used for diagnostics and fallback)
    const subjectIdQueryValuesAll = [
      ...subjectIdsAll,
      ...subjectIdsAll.map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean)
    ];

    // Query values for the student's year-specific subject list
    const subjectIdQueryValuesForYear = [
      ...subjectIdsForYear,
      ...subjectIdsForYear.map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean)
    ];

    const academicYearIdQueryValues = [
      studentAcademicYearIdStr,
      student.academicYearId
    ];

    // Debugging: log deptRows and subject id info to diagnose mismatches
    console.log(`--- [API LOG] deptRows count: ${deptRows.length}`);
    // deptRows entries are enriched subject results (one-per junction row) — show junction ids and resolved subject ids
    console.log(`--- [API LOG] deptRows sample (first 10):`, deptRows.slice(0, 10).map((r: any) => ({
      subjectId: r.id,
      subjectName: r.name,
      junctionId: r._junctionId,
      junctionSubjectId: r.junctionSubjectId,
      junctionAcademicYearId: r.junctionAcademicYearId,
      resolvedAcademicYearId: r.academicYear?.id || null,
    })));
    console.log(`--- [API LOG] subjectIdsForYear: ${subjectIdsForYear.length}`, subjectIdsForYear.slice(0, 40));
    console.log(`--- [API LOG] subjectIdsAll: ${subjectIdsAll.length}`, subjectIdsAll.slice(0, 40));

    // Find all assignments matching both department's subject list and department ID
    const assignmentsMatchingSubjectOnly = await db.collection('facultyAssignments').find({ 
      subjectId: { $in: subjectIdQueryValuesAll },
      departmentId: studentDepartmentIdStr
    }).toArray();
    console.log(`--- [API LOG] assignments matching subjectIds (no year filter): ${assignmentsMatchingSubjectOnly.length}`);

    // Also find assignments matching the student's academic year (regardless of subject) to compare.
    const assignmentsMatchingYearOnly = await db.collection('facultyAssignments').find({ academicYearId: { $in: academicYearIdQueryValues } }).toArray();
    console.log(`--- [API LOG] assignments matching academicYear (no subject filter): ${assignmentsMatchingYearOnly.length}`);

    // Now find assignments that match both subject and academicYear (the strict behavior)
    let assignmentsStrict: any[] = [];
    if (subjectIdQueryValuesAll.length > 0) {  // Use all subjects initially
      const assignments = await db.collection('facultyAssignments').find({
        subjectId: { $in: subjectIdQueryValuesAll },
        departmentId: studentDepartmentIdStr
      }).toArray();

      // Filter assignments based on academic year rules
      assignmentsStrict = assignments.filter(a => {
        const assignmentYear = a.academicYearId ? String(a.academicYearId) : null;
        
        // If the assignment has no academic year, it matches all years
        if (!assignmentYear) return true;

        // If it has an academic year, it must match the student's year
        return academicYearIdQueryValues.includes(assignmentYear);
      });
    }

    console.log(`--- [API LOG] assignments after subject+year (strict) filter: ${assignmentsStrict.length}`);

    // Identify which assignments belong to different academic years
    let excludedByYear: any[] = [];
    if (assignmentsMatchingSubjectOnly.length) {
      // Get all assignments for the subject that weren't included in strict matches
      const strictIds = new Set(assignmentsStrict.map(a => String(a._id)));
      excludedByYear = assignmentsMatchingSubjectOnly.filter(a => {
        const assignmentId = String(a._id);
        return !strictIds.has(assignmentId);
      });
    }
    if (excludedByYear.length) {
      console.log(`--- [API LOG] assignments excluded by academicYear (count=${excludedByYear.length}) sample:`, excludedByYear.slice(0, 10).map((a: any) => ({ _id: String(a._id), subjectId: a.subjectId, academicYearId: a.academicYearId })));
    }

    // If both strict assignments and excludedByYear are empty, nothing to return
    if (assignmentsStrict.length === 0 && excludedByYear.length === 0) return [];

    // Prepare final assignment list with correct academic year flags
    let assignments: any[] = [];
    
    // Mark strict matches (they match the student's year)
    const strictAssignments = assignmentsStrict.map(a => ({
      ...a,
      academicYearMismatch: false,
      assignmentAcademicYearId: a.academicYearId ? String(a.academicYearId) : null
    }));
    
    // Always include strict matches
    assignments = [...strictAssignments];

    // If fallback is allowed, add assignments from other years
    if (options?.allowAcademicYearFallback) {
      const excludedFlagged = excludedByYear.map(a => ({
        ...a,
        academicYearMismatch: true,
        assignmentAcademicYearId: a.academicYearId ? String(a.academicYearId) : null
      }));
      assignments = [...assignments, ...excludedFlagged];
    }

    // --- Batch fetch all related data (no changes needed here) ---
    const staffIds = assignments.map(a => new ObjectId(a.staffId));
    const staffProfiles = await db.collection('staff').find({ _id: { $in: staffIds } }).toArray();
    const staffProfileMap = new Map(staffProfiles.map(s => [s._id.toString(), s]));

    const userIds = staffProfiles.map(s => new ObjectId(s.userId));
    const staffUsers = await db.collection('users').find({ _id: { $in: userIds } }).toArray();
    const userMap = new Map(staffUsers.map(u => [u._id.toString(), u]));
    
    const subjectObjectIds = assignments.map(a => new ObjectId(a.subjectId));
    const subjectDetails = await db.collection('subjects').find({ _id: { $in: subjectObjectIds } }).toArray();
    const subjectMap = new Map(subjectDetails.map(s => [s._id.toString(), s]));
    
    const feedback = await db.collection('feedback').find({
      studentId: userId,
      assignmentId: { $in: assignments.map(a => a._id.toString()) },
    }).toArray();
    const feedbackSet = new Set(feedback.map(f => f.assignmentId));

    // If caller asked for ungrouped results, return one item per assignment (one per faculty assignment)
    const groupBySubject = options?.groupBySubject !== undefined ? Boolean(options?.groupBySubject) : true;

    if (!groupBySubject) {
      const perAssignment = assignments.map((a: any) => {
        const sid = String(a.subjectId);
        const staffProfile = staffProfileMap.get(String(a.staffId));
        const staffUser = staffProfile ? userMap.get(String(staffProfile.userId)) : null;
        const staffName = staffUser?.name || 'Unknown Faculty';
        const subject = subjectMap.get(sid);
        const assignmentId = a._id?.toString();
        const isCompleted = feedbackSet.has(a._id.toString());
        return {
          assignmentId: assignmentId || null,
          subjectId: sid,
          subjectName: subject?.name || 'Unknown Subject',
          staffId: a.staffId || null,
          facultyName: staffName,
          facultyNames: [staffName],
          // bubble through academicYear mismatch metadata if present
          academicYearMismatch: Boolean(a.academicYearMismatch),
          assignmentAcademicYearId: a.assignmentAcademicYearId ? String(a.assignmentAcademicYearId) : null,
          status: isCompleted ? 'Completed' : 'Pending',
        };
      });
      return perAssignment;
    }

    // Group assignments by subjectId so student sees one card per subject even if multiple staff are assigned.
    const tasksBySubject = new Map<string, any>();
    for (const a of assignments) {
      const sid = String(a.subjectId);
      const staffProfile = staffProfileMap.get(String(a.staffId));
      const staffUser = staffProfile ? userMap.get(String(staffProfile.userId)) : null;
      const staffName = staffUser?.name || 'Unknown Faculty';
      const subject = subjectMap.get(sid);
      const assignmentId = a._id?.toString();
      const isCompleted = feedbackSet.has(a._id.toString());

      if (!tasksBySubject.has(sid)) {
        tasksBySubject.set(sid, {
          subjectId: sid,
          subjectName: subject?.name || 'Unknown Subject',
          facultyNames: [staffName],
          assignmentIds: assignmentId ? [assignmentId] : [],
          // indicate if any assignment in this subject group is from a different academic year
          academicYearMismatch: Boolean(a.academicYearMismatch),
          // overall status: Pending if any assignment is pending, Completed only if all are completed
          status: isCompleted ? 'Completed' : 'Pending',
        });
      } else {
        const entry = tasksBySubject.get(sid);
        // add unique staff name
        if (!entry.facultyNames.includes(staffName)) entry.facultyNames.push(staffName);
        if (assignmentId && !entry.assignmentIds.includes(assignmentId)) entry.assignmentIds.push(assignmentId);
        // if any assignment is pending, overall remains Pending
        if (!isCompleted) entry.status = 'Pending';
        // propagate academicYearMismatch flag
        if (a.academicYearMismatch) entry.academicYearMismatch = true;
      }
    }

    // Convert to array; keep legacy-friendly fields: facultyName (comma-joined) and assignmentId (first)
    const resultTasks = Array.from(tasksBySubject.values()).map((t: any) => ({
      subjectId: t.subjectId,
      subjectName: t.subjectName,
      facultyNames: t.facultyNames,
      facultyName: t.facultyNames.join(', '),
      assignmentIds: t.assignmentIds,
      assignmentId: t.assignmentIds.length ? t.assignmentIds[0] : null,
      academicYearMismatch: Boolean(t.academicYearMismatch),
      status: t.status,
    }));

    return resultTasks;
  } catch (error) {
    console.error("Error in getStudentTasksFromDb:", error);
    return [];
  }
}