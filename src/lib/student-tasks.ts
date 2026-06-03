import { Document, ObjectId, WithId } from 'mongodb';
import { getDatabase } from './mongodb';
import { CACHE_KEYS, getCacheKey, getCachedOrFetch } from './cache-utils';

interface Department {
  id: string;
  name: string;
  abbreviation: string;
}

interface Subject extends Document {
  name: string;
  subjectCode: string;
  academicYearId: string;
  departments: Department[];
}

interface Assignment extends Document {
  staffId: string;
  subjectId: string;
  departmentId: string;
  academicYearId: string;
  semester?: string;
}

interface Staff extends Document {
  userId: string;
  departmentId: string;
}

interface User extends Document {
  name: string;
  email: string;
  role: string;
  departmentId?: string;
  academicYearId?: string;
}


interface Feedback extends Document {
  assignmentId: string;
  studentId: string;
  feedback?: string;
}

interface StudentTask {
  subjectId: string;
  subjectName: string;
  facultyNames: string[];
  facultyName: string;
  assignmentIds: string[];
  assignmentId: string | null;
  status: 'Pending' | 'Completed';
}

// Export wrapper function that uses caching
export async function getStudentTasksFromDb(userId: string, options?: { useCache?: boolean }): Promise<StudentTask[]> {
  const cacheKey = getCacheKey(CACHE_KEYS.STUDENT_TASKS, userId);
  
  if (options?.useCache !== false) {
    const cachedTasks = await getCachedOrFetch(cacheKey, async () => {
      return await _fetchStudentTasks(userId);
    });
    return cachedTasks;
  }

  return await _fetchStudentTasks(userId);
}

// Internal function that does the actual task fetching
async function _fetchStudentTasks(userId: string): Promise<StudentTask[]> {
  try {
    const db = await getDatabase();

    // 1. Fetch the student record
    const student = await db.collection<User>('users').findOne({
      _id: new ObjectId(userId)
    });

    if (!student || !student.departmentId || !student.academicYearId) {
      // console.error(`getStudentTasksFromDb: Student ${userId} lacks required fields.`);
      return [];
    }

    // 2. Get all subjects that have this department in their departments array or departmentIds
    let departmentIdObj;
    try {
      departmentIdObj = new ObjectId(student.departmentId);
    } catch (e) {
      // Department ID is not a valid ObjectId - expected in some cases
    }

    const departmentCriteria = {
      $or: [
        { departmentIds: { $in: [String(student.departmentId), departmentIdObj].filter(Boolean) } },
        { "departments.id": { $in: [String(student.departmentId), departmentIdObj].filter(Boolean) } }
      ]
    };

    // Build query to match subjects that belong to student's department AND academic year
    let query: any = departmentCriteria;

    // Add academic year condition if available
    if (student.academicYearId) {
      let academicYearIdObj;
      try {
        academicYearIdObj = new ObjectId(student.academicYearId);
      } catch (e) {
        // Academic Year ID is not a valid ObjectId - expected in some cases
      }
      query = {
        $and: [
          departmentCriteria,
          { academicYearId: { $in: [String(student.academicYearId), academicYearIdObj].filter(Boolean) } }
        ]
      };
    }

    const subjects = await db.collection<Subject>('subjects').find(query).toArray();

    if (!subjects || subjects.length === 0) {
      return [];
    }

    // Get current semester from settings
    const settings = await db.collection('settings').findOne({ type: 'semester' });
    if (!settings) {
      return [];
    }

    // Construct semester string
    const isOdd = settings.currentSemester % 2 === 1;
    const semesterType = isOdd ? 'Odd' : 'Even';
    const currentSemester = `${semesterType} ${settings.academicYear}`;

    // 3. Get all assignments for these subjects
    const subjectIds = subjects.map(s => s._id);
    const assignments = await db.collection<Assignment>('facultyAssignments').find({
      subjectId: { $in: subjectIds.map(id => id.toString()) },
      departmentId: student.departmentId,
      academicYearId: student.academicYearId,
      semester: currentSemester
    }).toArray();

    if (!assignments || assignments.length === 0) {
      return [];
    }

    // 4. Get staff and user data
    const staffIds = assignments.map(a => new ObjectId(a.staffId));
    const staffProfiles = await db.collection<Staff>('staff').find({
      _id: { $in: staffIds }
    }).toArray();

    const userIds = staffProfiles.map(s => new ObjectId(s.userId));
    const staffUsers = await db.collection<User>('users').find({
      _id: { $in: userIds }
    }).toArray();

    // Create maps for efficient lookups
    const subjectsById = new Map(subjects.map(s => [s._id.toString(), s]));
    const staffById = new Map(staffProfiles.map(s => [s._id.toString(), s]));
    const usersById = new Map(staffUsers.map(u => [u._id.toString(), u]));

    // 5. Get feedback status
    const feedbacks = await db.collection<Feedback>('feedback').find({
      studentId: userId,
      assignmentId: { $in: assignments.map(a => a._id.toString()) }
    }).toArray();

    const feedbackSet = new Set(feedbacks.map(f => f.assignmentId));

    // 6. Create individual tasks for each assignment
    const resultTasks = assignments.map(assignment => {
      const subjectId = assignment.subjectId;
      const staffMember = staffById.get(assignment.staffId);
      const staffUser = staffMember ? usersById.get(staffMember.userId) : null;
      const staffName = staffUser?.name || 'Unknown Faculty';
      const subject = subjectsById.get(subjectId);
      const assignmentId = assignment._id.toString();
      const isCompleted = feedbackSet.has(assignmentId);

      return {
        subjectId,
        subjectName: subject?.name || 'Unknown Subject',
        facultyNames: [staffName],
        facultyName: staffName,
        assignmentIds: [assignmentId],
        assignmentId: assignmentId,
        status: isCompleted ? 'Completed' as const : 'Pending' as const,
      };
    });

    return resultTasks;
  } catch (error) {
    // console.error("Error in getStudentTasksFromDb:", error);
    return [];
  }
}