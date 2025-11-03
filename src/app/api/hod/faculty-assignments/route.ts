/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, assignmentService, subjectService, normalizeSemester, normalizeAcademicYearId } from "@/lib/mongodb-services";
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { CACHE_KEYS, invalidateCache } from '@/lib/cache-utils';


export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hodUserId = session.user.id as string;
    const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const departmentId = hodProfile.departmentId;
    const departmentIdStr = String(departmentId);

    const database = await getDatabase();
    
    // Get current semester from settings
    const settings = await database.collection('settings').findOne({ type: 'semester' });
    if (!settings) {
      return NextResponse.json({ error: "Semester settings not found" }, { status: 404 });
    }

    // Allow semester override via query param, fall back to current semester from settings
    let semesterNormalized;
    try {
      const url = new URL(request.url);
      const requestedSemester = url.searchParams.get('semester');
      if (requestedSemester) {
        semesterNormalized = normalizeSemester(requestedSemester);
      } else {
        // Construct semester string from settings
        const isOdd = settings.currentSemester % 2 === 1;
        const semesterType = isOdd ? 'Odd' : 'Even';
        semesterNormalized = `${semesterType} ${settings.academicYear}`;
      }
    } catch (e) {
      // Use settings as fallback if URL parsing fails
      const isOdd = settings.currentSemester % 2 === 1;
      const semesterType = isOdd ? 'Odd' : 'Even';
      semesterNormalized = `${semesterType} ${settings.academicYear}`;
    }
    
    console.log('Using semester:', semesterNormalized);

    // Get subjects using the same query structure that works in the POST handler
    let departmentIdObj;
    try {
      departmentIdObj = new ObjectId(departmentId);
    } catch (e) {
      console.log('Department ID is not a valid ObjectId');
    }

    const query = {
      $or: [
        { departmentIds: { $in: [departmentIdStr, departmentIdObj].filter(Boolean) } },
        { "departments.id": { $in: [departmentIdStr, departmentIdObj].filter(Boolean) } }
      ]
    };

    console.log('Subject query:', JSON.stringify(query, null, 2));
    
    const subjects = await database.collection("subjects")
      .find(query)
      .toArray();

    console.log('Found subjects:', subjects.length);
    console.log('Subject details:', JSON.stringify(subjects.map(s => ({
      id: s._id,
      name: s.name,
      departmentIds: s.departmentIds,
      departments: s.departments,
      academicYearId: s.academicYearId
    })), null, 2));

    // Get assignments for these subjects
    const subjectIds = subjects.map(s => String(s._id));
    
    // Build assignment query
    const assignmentQuery = {
      departmentId: String(departmentId),
      semester: semesterNormalized,
      subjectId: { $in: subjectIds.map(id => String(id)) }
    };

    console.log('Assignment query:', JSON.stringify(assignmentQuery, null, 2));
    
    const assignments = await database.collection('facultyAssignments')
      .find(assignmentQuery)
      .toArray();

    console.log('Found assignments:', assignments.length);
    console.log('Assignment details:', JSON.stringify(assignments, null, 2));

    // Build subject details map
    const subjectMap = new Map(subjects.map(s => [
      String(s._id),
      {
        id: String(s._id),
        name: s.name,
        subjectCode: s.subjectCode,
        academicYearId: s.academicYearId
      }
    ]));

    // Get staff details
    const staffIds = new Set(assignments.map(a => String(a.staffId)));
    const staffList = await Promise.all(
      Array.from(staffIds).map(id => 
        staffService.findUnique({ where: { id }, include: { user: true } })
      )
    );

    const staffMap = new Map(
      staffList.filter(Boolean).map(s => [
        String(s.id),
        {
          id: String(s.id),
          name: s.user?.name || s.user?.email || 'Unknown'
        }
      ])
    );

    // Build final response
    const enrichedAssignments = assignments.map(a => ({
      id: String(a._id),
      subjectId: String(a.subjectId),
      staffId: String(a.staffId),
      semester: a.semester,
      departmentId: String(a.departmentId),
      subject: subjectMap.get(String(a.subjectId)) || null,
      staff: staffMap.get(String(a.staffId)) || null,
      academicYearId: subjectMap.get(String(a.subjectId))?.academicYearId || null,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt
    }));

    console.log('Returning assignments:', JSON.stringify(enrichedAssignments, null, 2));
    return NextResponse.json(enrichedAssignments);
  } catch (error) {
    console.error('GET /api/hod/faculty-assignments error:', error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    console.log('Starting faculty assignment POST handler');
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session.user?.role !== "HOD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const database = await getDatabase();
    if (!database) {
      console.error('Failed to get database connection');
      throw new Error('Database connection failed');
    }
    
    // Get current semester from settings if not provided in body
    let semester;
    if (body?.semester) {
      semester = body.semester;
    } else {
      const settings = await database.collection('settings').findOne({ type: 'semester' });
      if (!settings) {
        return NextResponse.json({ error: "Semester settings not found" }, { status: 404 });
      }
      const isOdd = settings.currentSemester % 2 === 1;
      const semesterType = isOdd ? 'Odd' : 'Even';
      semester = `${semesterType} ${settings.academicYear}`;
    }
    
    const assignments = Array.isArray(body?.assignments) ? body.assignments : [];
    console.log(`Processing ${assignments.length} assignments for semester ${semester}`);

    const hodUserId = session.user.id as string;
    const hodProfile = await staffService.findUnique({ where: { userId: hodUserId } });
    if (!hodProfile) return NextResponse.json({ error: "HOD profile not found" }, { status: 404 });

    const departmentId = hodProfile.departmentId;
    console.log('Department ID:', departmentId);

    // Verify database connection by checking collections
    try {
      const collections = await database.collections();
      const collectionNames = collections.map(c => c.collectionName);
      console.log('Available collections:', collectionNames);
      
      if (!collectionNames.includes('subjects')) {
        throw new Error('Subjects collection not found');
      }
    } catch (error) {
      console.error('Database validation failed:', error);
      throw new Error('Database validation failed: ' + (error as Error).message);
    }

    console.log('Fetching subjects for department:', departmentId);
    
    // Get subjects with the matching department ID
    // First, let's debug what subjects exist and their full structure
    const allSubjects = await database.collection("subjects").find({}).toArray();
    console.log('Full subject documents:', JSON.stringify(allSubjects, null, 2));
    
    // Log the department ID we're looking for
    console.log('Looking for department ID:', departmentId);
    
    // Try a simpler query first to verify data access
    const testQuery = await database.collection("subjects").find({}).toArray();
    console.log('All subjects count:', testQuery.length);

    // Now try to find subjects for our department, handling both string and ObjectId
    const departmentIdStr = String(departmentId);
    let departmentIdObj;
    try {
      departmentIdObj = new ObjectId(departmentId);
    } catch (e) {
      console.log('Department ID is not a valid ObjectId');
    }

    const query = {
      $or: [
        { departmentIds: { $in: [departmentIdStr, departmentIdObj].filter(Boolean) } },
        { "departments.id": { $in: [departmentIdStr, departmentIdObj].filter(Boolean) } }
      ]
    };

    const subjects = await database.collection("subjects")
      .find(query)
      .toArray();
    
    console.log('Query used:', JSON.stringify(query, null, 2));
    console.log('Subjects found:', subjects.length);
    
    console.log('Department subject query result:', JSON.stringify(subjects, null, 2));
    
    console.log(`Found ${subjects.length} subjects for department:`, subjects.map(s => ({ 
      id: s._id, 
      name: s.name,
      academicYearId: s.academicYearId 
    })));
    
    // Get both _id and id from subjects since either might be used
    const deptSubjectIds = new Set();
    subjects.forEach(s => {
      // Add various forms of the ID to catch all possibilities
      if (s._id) {
        deptSubjectIds.add(String(s._id));
        try { deptSubjectIds.add(new ObjectId(s._id).toString()); } catch (e) {}
      }
      if (s.id) {
        deptSubjectIds.add(String(s.id));
        try { deptSubjectIds.add(new ObjectId(s.id).toString()); } catch (e) {}
      }
    });
    
    const subjectIdToMatch = String(assignments[0]?.subjectId);
    console.log('Department subject IDs:', Array.from(deptSubjectIds));
    console.log('Looking for assignment with subjectId:', subjectIdToMatch);
    
    // Debug each ID comparison
    Array.from(deptSubjectIds).forEach(id => {
      console.log(`Comparing ${id} with ${subjectIdToMatch}: ${id === subjectIdToMatch}`);
    });

    // Only accept assignments for subjects that belong to this department
    const filteredAssignments = Array.isArray(assignments)
      ? assignments.filter((a: any) => {
          const valid = deptSubjectIds.has(String(a.subjectId));
          if (!valid) {
            console.log('Invalid assignment:', JSON.stringify(a, null, 2), 
                      '\nValid subject IDs:', Array.from(deptSubjectIds));
          }
          return valid;
        })
      : [];
    console.log(`Filtered ${assignments.length} assignments down to ${filteredAssignments.length} valid ones`);

    // Create map of subject details including academicYearId
    const subjectDetailsMap = new Map(subjects.map(s => [
      String(s._id),
      { 
        academicYearId: s.academicYearId,
        name: s.name,
        subjectCode: s.subjectCode
      }
    ]));

    // Fetch existing assignments for this department+semester limited to the department's subjects
    const existingFilter: any = { 
      departmentId: String(departmentId), 
      semester: normalizeSemester(semester),
      subjectId: { $in: Array.from(deptSubjectIds) }
    };
    const existingRaw = await database.collection('facultyAssignments').find(existingFilter).toArray();

    // Build maps keyed by staffId:subjectId:semester for quick comparison
    const existingMap = new Map<string, any>();
    for (const ex of existingRaw) {
      const key = `${String(ex.staffId)}:${String(ex.subjectId)}:${String(normalizeSemester(ex.semester))}`;
      existingMap.set(key, ex);
    }

    // Desired set and de-duplication
    const desiredMap = new Map<string, any>();
    for (const a of filteredAssignments) {
      const staffId = String(a.staffId);
      const subjectId = String(a.subjectId);
      const sem = normalizeSemester(semester);
      const key = `${staffId}:${subjectId}:${sem}`;
      if (desiredMap.has(key)) continue; // de-duplicate incoming payload

      const subjectDetails = subjectDetailsMap.get(subjectId);
      if (!subjectDetails?.academicYearId) {
        console.warn(`No academicYearId found for subject ${subjectId}`);
        continue; // Skip assignments without academicYearId
      }

      desiredMap.set(key, {
        staffId,
        subjectId,
        semester: sem,
        departmentId: String(departmentId),
        academicYearId: String(subjectDetails.academicYearId),
        updatedAt: new Date(),
      });
    }

  // Truncate existing assignments for this department+semester (department-scoped truncate)
  // This implements the requested behaviour: when HOD clicks "Save all assignments" we remove
  // the existing rows for this department and semester and re-insert the incoming set, preventing
  // lingering duplicates caused by remove->add flows. NOTE: deletion is scoped to the department
  // and semester and the department's subjects.
  let created = 0;
  let updated = 0;
  let deleted = 0;

  // Get collection reference
  const famCol = database.collection('facultyAssignments');
  const semNormalized = normalizeSemester(semester);

  // Build delete filter
  const deleteFilter: any = { 
    semester: semNormalized,
    departmentId: String(departmentId) 
  };

  // departmentId may be stored as ObjectId or string in existing rows; match both when possible
  try {
    if (typeof departmentId === 'string' && /^[0-9a-fA-F]{24}$/.test(departmentId)) {
      deleteFilter.departmentId = { $in: [ new ObjectId(departmentId), String(departmentId) ] };
    } else {
      deleteFilter.departmentId = String(departmentId);
    }
  } catch (e) {
    deleteFilter.departmentId = String(departmentId);
  }

  if (deptSubjectIds.size > 0) {
    deleteFilter.subjectId = { $in: Array.from(deptSubjectIds).map(id => String(id)) };
  }

  // Log the filtered assignments we'll be working with
  console.log('Filtered assignments:', JSON.stringify(filteredAssignments, null, 2));

  // Invalidate cache before making changes
  await Promise.all([
    invalidateCache(CACHE_KEYS.STUDENT_TASKS),
    invalidateCache(CACHE_KEYS.FACULTY_ASSIGNMENTS)
  ]);

  // Delete existing assignments
  console.log('Deleting existing assignments with filter:', JSON.stringify(deleteFilter, null, 2));
  const delRes = await famCol.deleteMany(deleteFilter);
  deleted = delRes.deletedCount ?? 0;
  console.log(`Deleted ${deleted} existing assignments`);

  // Prepare documents for insertion
  const docsToInsert: any[] = [];
  const now = new Date();
  for (const [k, v] of desiredMap.entries()) {
    const doc = {
      _id: new ObjectId(),
      staffId: String(v.staffId),
      subjectId: String(v.subjectId),
      semester: v.semester,
      departmentId: String(v.departmentId),
      academicYearId: String(v.academicYearId),
      createdAt: now,
      updatedAt: now,
    };
    console.log('Preparing to insert assignment:', JSON.stringify(doc, null, 2));
    docsToInsert.push(doc);
  }

  if (docsToInsert.length) {
    console.log(`Attempting to insert ${docsToInsert.length} assignments`);
    try {
      // Insert with write concern acknowledged to ensure writes complete
      const ins = await famCol.insertMany(docsToInsert, { writeConcern: { w: 1 } });
      created = ins.insertedCount ?? docsToInsert.length;
      console.log(`Successfully inserted ${created} assignments:`, ins.insertedIds);
      
      // Verify the inserts
      const verifyCount = await famCol.countDocuments({
        departmentId: String(departmentId),
        semester: semNormalized
      });
      console.log(`Verification - found ${verifyCount} assignments after insert`);
      
    } catch (error) {
      console.error('Error inserting assignments:', error);
      throw error;
    }
  } else {
    console.log('No assignments to insert');
  }

  // Return response with verification
  const finalCount = await famCol.countDocuments({
    departmentId: String(departmentId),
    semester: semNormalized
  });
  
  return NextResponse.json({ 
    success: true, 
    created, 
    updated, 
    deleted, 
    total: desiredMap.size,
    currentCount: finalCount 
  });
  } catch (error: any) {
    console.error("API /hod/faculty-assignments POST error:", error);
    return NextResponse.json({ error: error?.message || "Failed to save assignments" }, { status: 500 });
  }
}
