import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '../mongodb-services';
import { getDatabase } from '../mongodb';
import { timestampToDate } from '../mongodb-services';

/**
 * Return subject documents for a department.
 * options may include { include: { academicYear: true } }
 */
export async function findSubjectsForDepartment(departmentId: string, options?: { include?: any }) {
  try {
    const db = await getDatabase();
    if (!departmentId) return [];
    const depIdStr = String(departmentId);

    console.log('🔍 [departmentSubjectsService] Finding subjects for department:', depIdStr);

    // 1) Fetch junction rows linking subjects to this department
    const junctions = await db.collection(COLLECTIONS.DEPARTMENT_SUBJECTS)
      .find({ departmentId: depIdStr })
      .toArray();
    
    if (!junctions || junctions.length === 0) {
      console.log('❌ [departmentSubjectsService] No junction rows found for department');
      return [];
    }

    // 2) Extract unique IDs and convert to ObjectIds where possible
    const uniqueYearIds = new Set<string>();
    const uniqueSubjectIds = new Set<string>();
    const yearObjectIds: ObjectId[] = [];
    const subjectObjectIds: ObjectId[] = [];

    // Build sets of IDs and convert to ObjectIds where possible
    for (const junction of junctions) {
      if (junction.academicYearId) {
        const yearId = String(junction.academicYearId);
        uniqueYearIds.add(yearId);
        try {
          yearObjectIds.push(new ObjectId(yearId));
        } catch {}
      }

      if (junction.subjectId) {
        const subjectId = String(junction.subjectId);
        uniqueSubjectIds.add(subjectId);
        try {
          subjectObjectIds.push(new ObjectId(subjectId));
        } catch {}
      }
    }

    // 3) Fetch related data in parallel
    const [academicYears, subjects] = await Promise.all([
      // Fetch academic years
      yearObjectIds.length ? db.collection(COLLECTIONS.ACADEMIC_YEARS)
        .find({ _id: { $in: yearObjectIds } })
        .toArray() : [],
      
      // Fetch subjects
      subjectObjectIds.length ? db.collection(COLLECTIONS.SUBJECTS)
        .find({ _id: { $in: subjectObjectIds } })
        .toArray() : []
    ]);

    // 4) Create lookup maps
    const yearMap = new Map(academicYears.map(year => [
      String(year._id), 
      {
        id: String(year._id),
        _id: String(year._id), 
        name: year.name,
        abbreviation: year.abbreviation,
        departmentId: year.departmentId ? String(year.departmentId) : undefined,
        createdAt: year.createdAt
      }
    ]));

    const subjectMap = new Map(subjects.map(s => [
      String(s._id),
      {
        id: String(s._id),
        _id: String(s._id),
        name: s.name,
        subjectCode: s.subjectCode,
        semester: s.semester,
        departmentId: s.departmentId,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      }
    ]));

    // 5) Build enriched results by mapping junctions to full data
    const enrichedRows = junctions
      .map((junction: any) => {
        const subjectId = String(junction.subjectId);
        const subject = subjectMap.get(subjectId);
        if (!subject) return null;

        const academicYearId = junction.academicYearId ? String(junction.academicYearId) : null;
        const academicYear = academicYearId ? yearMap.get(academicYearId) : null;

        return {
          _id: subject.id,
          id: subject.id,
          name: subject.name,
          subjectCode: subject.subjectCode,
          semester: subject.semester,
          departmentId: subject.departmentId || depIdStr,
          _junctionId: junction._id.toString(),
          junctionSubjectId: subjectId,
          junctionAcademicYearId: academicYearId,
          academicYear,
          createdAt: timestampToDate(junction.createdAt) || timestampToDate(subject.createdAt),
          updatedAt: timestampToDate(junction.updatedAt) || timestampToDate(subject.updatedAt)
        };
      })
      .filter(Boolean);

    return enrichedRows;

  } catch (error) {
    console.error('Error in departmentSubjectsService.findSubjectsForDepartment:', error);
    throw error;
  }
}