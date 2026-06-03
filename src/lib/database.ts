import { MongoClient, ObjectId, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'FeedbackPortal2';

export interface Department {
  _id: ObjectId;
  name: string;
  abbreviation: string;
  isFeedbackActive: boolean;
  createdAt: Date;
}

export interface Subject {
  _id: ObjectId;
  name: string;
  subjectCode: string;
  departmentId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface AcademicYear {
  _id: ObjectId;
  name: string;
  abbreviation: string;
  departmentId: ObjectId;
  year: number;
  createdAt: Date;
}

export interface Settings {
  _id: ObjectId;
  departmentId: ObjectId;
  type: string;
  currentSemester: number;
  academicYear: string;
  updatedAt: Date;
}

export class DatabaseService {
  private client: MongoClient | null;
  private db: Db | null;

  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect(): Promise<Db> {
    if (!this.client) {
      this.client = await MongoClient.connect(uri);
      this.db = this.client.db(dbName);
    }
    if (!this.db) {
      throw new Error('Database connection failed');
    }
    return this.db;
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  async getSubjectsForDepartment(departmentId: string): Promise<Subject[]> {
    const db = await this.connect();
    return db.collection('subjects')
      .find({ departmentId: new ObjectId(departmentId) })
      .toArray() as Promise<Subject[]>;
  }

  async getDepartmentSettings(departmentId: string): Promise<Settings | null> {
    const db = await this.connect();
    return db.collection('settings')
      .findOne({ departmentId: new ObjectId(departmentId) }) as Promise<Settings | null>;
  }

  async getAcademicYearsForDepartment(departmentId: string): Promise<AcademicYear[]> {
    const db = await this.connect();
    return db.collection('academicYears')
      .find({ departmentId: new ObjectId(departmentId) })
      .toArray() as Promise<AcademicYear[]>;
  }

  async getFacultyAssignments(departmentId: string, academicYearId: string) {
    const db = await this.connect();
    return db.collection('facultyAssignments')
      .aggregate([
        {
          $match: {
            departmentId: new ObjectId(departmentId),
            academicYearId: new ObjectId(academicYearId)
          }
        },
        {
          $lookup: {
            from: 'subjects',
            localField: 'subjectId',
            foreignField: '_id',
            as: 'subject'
          }
        },
        {
          $lookup: {
            from: 'staff',
            localField: 'staffId',
            foreignField: '_id',
            as: 'staff'
          }
        },
        {
          $unwind: '$subject'
        },
        {
          $unwind: '$staff'
        }
      ])
      .toArray();
  }
}

export default new DatabaseService();