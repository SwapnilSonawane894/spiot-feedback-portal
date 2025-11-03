import { ObjectId } from 'mongodb';
import { getDatabase } from '../mongodb';

export class DepartmentSubjectsService {
  async findSubjectsForDepartment(departmentId: string, options: any = {}) {
    console.log('🔍 [departmentSubjectsService] Finding subjects for department:', departmentId);
    
    const db = await getDatabase();

    // Get all subjects with department links and academic year info
    const subjects = await db.collection('subjects')
      .aggregate([
        {
          $lookup: {
            from: 'departmentSubjects',
            let: { subjectId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$subjectId', '$$subjectId'] },
                      { $eq: ['$departmentId', new ObjectId(departmentId)] }
                    ]
                  }
                }
              }
            ],
            as: 'deptLink'
          }
        },
        {
          $match: {
            'deptLink': { $not: { $size: 0 } }
          }
        },
        {
          $lookup: {
            from: 'academicYears',
            localField: 'academicYearId',
            foreignField: '_id',
            as: 'academicYear'
          }
        },
        {
          $unwind: {
            path: '$academicYear',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: { $toString: '$_id' },
            id: { $toString: '$_id' },
            name: 1,
            subjectCode: 1,
            semester: 1,
            academicYearId: { $toString: '$academicYearId' },
            departmentId: { $toString: departmentId },
            academicYear: {
              id: { $toString: '$academicYear._id' },
              name: '$academicYear.name',
              abbreviation: '$academicYear.abbreviation'
            }
          }
        },
        {
          $sort: { name: 1 }
        }
      ])
      .toArray();

    console.log('Found subjects:', subjects.length);

    return subjects;
  }

  async linkExists(departmentId: string, subjectId: string) {
    const db = await getDatabase();
    const link = await db.collection('departmentSubjects').findOne({
      departmentId: new ObjectId(departmentId),
      subjectId: new ObjectId(subjectId)
    });
    return !!link;
  }

  async linkSubjectToDepartment({ departmentId, subjectId, academicYearId }: any) {
    const db = await getDatabase();
    
    // First get the subject to get its code
    const subject = await db.collection('subjects').findOne({ _id: new ObjectId(subjectId) });
    if (!subject) {
      throw new Error('Subject not found');
    }

    return await db.collection('departmentSubjects').updateOne(
      {
        departmentId: new ObjectId(departmentId),
        subjectId: new ObjectId(subjectId)
      },
      {
        $set: {
          subjectCode: subject.subjectCode,
          academicYearId: academicYearId ? new ObjectId(academicYearId) : null,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
  }
}

export const departmentSubjectsService = new DepartmentSubjectsService();