import { getDatabase } from './mongodb';
import { ObjectId } from 'mongodb';

interface Subject {
  departmentId: string;
  subjectCode?: string; // Made optional since we'll auto-generate it
  name: string;
  semester?: number;
  createdAt?: Date;
}

// Helper to convert MongoDB _id to id
const docWithId = (doc: any) => {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id?.toString(), ...rest };
};

// Helper to find subject code by name or generate new one
async function generateNextSubjectCode(db: any, departmentId: string, name: string): Promise<string> {
  try {
    // First normalize the subject name (lowercase and trim)
    const normalizedName = name.trim().toLowerCase();
    
    // Check if same subject name exists in any department
    const existingSubject = await db.collection('subjects')
      .findOne({ name: normalizedName });
    
    // If found, use the same code
    if (existingSubject && existingSubject.subjectCode) {
      console.log(`Found existing subject "${name}" with code ${existingSubject.subjectCode}`);
      return existingSubject.subjectCode;
    }
    
    // If not found, generate new code based on total unique codes
    const allSubjects = await db.collection('subjects').find({}).toArray();
    const codes = allSubjects
      .map((s: { subjectCode: string }) => s.subjectCode ? parseInt(s.subjectCode) : null)
      .filter((code: number | null): code is number => code !== null && !isNaN(code));
    
    // Return next number as string
    const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
    const newCode = String(maxCode + 1);
    console.log(`Generated new code ${newCode} for subject "${name}"`);
    return newCode;
  } catch (error) {
    console.error('Error generating subject code:', error);
    throw error;
  }
}

export const deptSubjectService = {
  async create(data: Subject) {
    try {
      const db = await getDatabase();
      const { departmentId, subjectCode, name, semester } = data;

      if (!departmentId || !name) {
        throw new Error('departmentId and name are required');
      }

      // Auto-generate subject code if not provided
      const finalSubjectCode = subjectCode || await generateNextSubjectCode(db, departmentId, name);

      // Create subject directly linked to department
      const subject = {
        departmentId: String(departmentId),
        subjectCode: String(finalSubjectCode),
        name: name.trim().toLowerCase(), // Store normalized name
        semester: semester || 1,
        createdAt: new Date()
      };

      const result = await db.collection('subjects').insertOne(subject);
      return { id: result.insertedId.toString(), ...subject };
    } catch (error) {
      console.error('Error in deptSubjectService.create:', error);
      throw error;
    }
  },

  async findByDepartment(departmentId: string) {
    try {
      const db = await getDatabase();
      const results = await db.collection('subjects')
        .find({ departmentId: String(departmentId) })
        .toArray();
      return results.map(docWithId);
    } catch (error) {
      console.error('Error in deptSubjectService.findByDepartment:', error);
      throw error;
    }
  },

  async findByDepartmentAndCode(departmentId: string, subjectCode: string) {
    try {
      const db = await getDatabase();
      const subject = await db.collection('subjects').findOne({
        departmentId: String(departmentId),
        subjectCode: String(subjectCode)
      });
      return docWithId(subject);
    } catch (error) {
      console.error('Error in deptSubjectService.findByDepartmentAndCode:', error);
      throw error;
    }
  },

  async update(id: string, data: Partial<Subject>) {
    try {
      const db = await getDatabase();
      const result = await db.collection('subjects').updateOne(
        { _id: new ObjectId(id) },
        { $set: data }
      );
      return { success: result.modifiedCount > 0 };
    } catch (error) {
      console.error('Error in deptSubjectService.update:', error);
      throw error;
    }
  }
};