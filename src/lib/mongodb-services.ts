import { getDatabase } from './mongodb';
import { ObjectId } from 'mongodb';

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  DEPARTMENTS: 'departments',
  STAFF: 'staff',
  ACADEMIC_YEARS: 'academicYears',
  SUBJECTS: 'subjects',
  FACULTY_ASSIGNMENTS: 'facultyAssignments',
  FEEDBACK: 'feedback',
  HOD_SUGGESTIONS: 'hodSuggestions',
  SETTINGS: 'settings',
};

// Helper to convert MongoDB _id to id
const docWithId = (doc: any) => {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
};

// Helper to handle date objects
const timestampToDate = (timestamp: any) => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  return new Date(timestamp);
};

// ============ USER OPERATIONS ============

export const userService = {
  async findUnique(where: { email?: string; id?: string }) {
    try {
      const db = await getDatabase();
      let query: any = {};
      
      if (where.id) {
        query._id = new ObjectId(where.id);
      } else if (where.email) {
        query.email = where.email;
      }
      
      const doc = await db.collection(COLLECTIONS.USERS).findOne(query);
      return docWithId(doc);
    } catch (error) {
      console.error('Error in userService.findUnique:', error);
      throw error;
    }
  },

  async findMany(params?: { where?: any; select?: any; orderBy?: any; limit?: number }) {
    try {
      const db = await getDatabase();
      const query: any = {};
      
      if (params?.where) {
        Object.entries(params.where).forEach(([key, value]) => {
          if (value !== undefined) {
            if (key === 'id') {
              query._id = new ObjectId(value as string);
            } else {
              query[key] = value;
            }
          }
        });
      }

      let cursor = db.collection(COLLECTIONS.USERS).find(query);

      if (params?.orderBy) {
        const sort: any = {};
        Object.entries(params.orderBy).forEach(([key, value]) => {
          sort[key] = value === 'asc' ? 1 : -1;
        });
        cursor = cursor.sort(sort);
      }

      if (params?.limit) {
        cursor = cursor.limit(params.limit);
      }

      let results = await cursor.toArray();
      results = results.map(docWithId);

      if (params?.select) {
        return results.map((item: any) => {
          const selected: any = {};
          Object.keys(params.select).forEach(key => {
            if (params.select[key]) selected[key] = item[key];
          });
          return selected;
        });
      }

      return results;
    } catch (error) {
      console.error('Error in userService.findMany:', error);
      throw error;
    }
  },

  async create(data: any) {
    try {
      const db = await getDatabase();
      const { id, ...rest } = data;
      const result = await db.collection(COLLECTIONS.USERS).insertOne({
        ...rest,
        createdAt: new Date(),
      });
      return { id: result.insertedId.toString(), ...rest };
    } catch (error) {
      console.error('Error in userService.create:', error);
      throw error;
    }
  },

  async update(where: { id: string }, data: any) {
    try {
      const db = await getDatabase();
      const { id, ...rest } = data;
      await db.collection(COLLECTIONS.USERS).updateOne(
        { _id: new ObjectId(where.id) },
        { $set: rest }
      );
      return { id: where.id, ...rest };
    } catch (error) {
      console.error('Error in userService.update:', error);
      throw error;
    }
  },

  async updateMany(where: any, data: any) {
    try {
      const db = await getDatabase();
      const query: any = {};
      
      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          query[key] = value;
        }
      });

      const result = await db.collection(COLLECTIONS.USERS).updateMany(query, { $set: data });
      return { count: result.modifiedCount };
    } catch (error) {
      console.error('Error in userService.updateMany:', error);
      throw error;
    }
  },

  async delete(where: { id: string }) {
    try {
      const db = await getDatabase();
      await db.collection(COLLECTIONS.USERS).deleteOne({ _id: new ObjectId(where.id) });
      return { success: true };
    } catch (error) {
      console.error('Error in userService.delete:', error);
      throw error;
    }
  },

  async deleteMany(where: any) {
    try {
      const db = await getDatabase();
      const query: any = {};
      
      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          query[key] = value;
        }
      });

      const result = await db.collection(COLLECTIONS.USERS).deleteMany(query);
      return { count: result.deletedCount };
    } catch (error) {
      console.error('Error in userService.deleteMany:', error);
      throw error;
    }
  },

  async count(where?: any) {
    try {
      const db = await getDatabase();
      const query: any = where || {};
      return await db.collection(COLLECTIONS.USERS).countDocuments(query);
    } catch (error) {
      console.error('Error in userService.count:', error);
      throw error;
    }
  },
};

// ============ DEPARTMENT OPERATIONS ============

export const departmentService = {
  async findMany(params?: { where?: any; orderBy?: any }) {
    try {
      const db = await getDatabase();
      const query: any = params?.where || {};

      let cursor = db.collection(COLLECTIONS.DEPARTMENTS).find(query);

      if (params?.orderBy) {
        const sort: any = {};
        Object.entries(params.orderBy).forEach(([key, value]) => {
          sort[key] = value === 'asc' ? 1 : -1;
        });
        cursor = cursor.sort(sort);
      }

      const results = await cursor.toArray();
      return results.map(docWithId);
    } catch (error) {
      console.error('Error in departmentService.findMany:', error);
      throw error;
    }
  },

  async findUnique(where: { id?: string; abbreviation?: string }) {
    try {
      const db = await getDatabase();
      let query: any = {};
      
      if (where.id) {
        query._id = new ObjectId(where.id);
      } else if (where.abbreviation) {
        query.abbreviation = where.abbreviation;
      }

      const doc = await db.collection(COLLECTIONS.DEPARTMENTS).findOne(query);
      return docWithId(doc);
    } catch (error) {
      console.error('Error in departmentService.findUnique:', error);
      throw error;
    }
  },

  async create(data: any) {
    try {
      const db = await getDatabase();
      const { id, ...rest } = data;
      const result = await db.collection(COLLECTIONS.DEPARTMENTS).insertOne({
        ...rest,
        isFeedbackActive: rest.isFeedbackActive ?? false,
        createdAt: new Date(),
      });
      return { id: result.insertedId.toString(), ...rest };
    } catch (error) {
      console.error('Error in departmentService.create:', error);
      throw error;
    }
  },

  async update(where: { id: string }, data: any) {
    try {
      const db = await getDatabase();
      const { id, ...rest } = data;
      await db.collection(COLLECTIONS.DEPARTMENTS).updateOne(
        { _id: new ObjectId(where.id) },
        { $set: rest }
      );
      return { id: where.id, ...rest };
    } catch (error) {
      console.error('Error in departmentService.update:', error);
      throw error;
    }
  },

  async delete(where: { id: string }) {
    try {
      const db = await getDatabase();
      await db.collection(COLLECTIONS.DEPARTMENTS).deleteOne({ _id: new ObjectId(where.id) });
      return { success: true };
    } catch (error) {
      console.error('Error in departmentService.delete:', error);
      throw error;
    }
  },
};

// ============ STAFF OPERATIONS ============

export const staffService = {
  async findMany(params?: { where?: any; include?: any; orderBy?: any }) {
    try {
      const db = await getDatabase();
      const query: any = params?.where || {};

      if (query.userId) {
        query.userId = query.userId;
      }
      if (query.departmentId) {
        query.departmentId = query.departmentId;
      }

      let cursor = db.collection(COLLECTIONS.STAFF).find(query);

      if (params?.orderBy) {
        const sort: any = {};
        Object.entries(params.orderBy).forEach(([key, value]) => {
          sort[key] = value === 'asc' ? 1 : -1;
        });
        cursor = cursor.sort(sort);
      }

      let results = await cursor.toArray();
      results = results.map(docWithId);

      if (params?.include) {
        for (const staff of results) {
          if (params.include.user && staff.userId) {
            const user = await userService.findUnique({ id: staff.userId });
            staff.user = user;
          }
          if (params.include.department && staff.departmentId) {
            const dept = await departmentService.findUnique({ id: staff.departmentId });
            staff.department = dept;
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error in staffService.findMany:', error);
      throw error;
    }
  },

  async findUnique(params: { where: { id?: string; userId?: string }; include?: any }) {
    try {
      const db = await getDatabase();
      let query: any = {};
      
      if (params.where.id) {
        query._id = new ObjectId(params.where.id);
      } else if (params.where.userId) {
        query.userId = params.where.userId;
      }

      const doc = await db.collection(COLLECTIONS.STAFF).findOne(query);
      let staff = docWithId(doc);

      if (staff && params.include) {
        if (params.include.user && staff.userId) {
          const user = await userService.findUnique({ id: staff.userId });
          staff.user = user;
        }
        if (params.include.department && staff.departmentId) {
          const dept = await departmentService.findUnique({ id: staff.departmentId });
          staff.department = dept;
        }
      }

      return staff;
    } catch (error) {
      console.error('Error in staffService.findUnique:', error);
      throw error;
    }
  },

  async findFirst(params: { where: { id?: string; userId?: string }; include?: any }) {
    return this.findUnique(params);
  },

  async create(data: any) {
    try {
      const db = await getDatabase();
      const { id, ...rest } = data;
      const result = await db.collection(COLLECTIONS.STAFF).insertOne({
        ...rest,
        createdAt: new Date(),
      });
      return { id: result.insertedId.toString(), ...rest };
    } catch (error) {
      console.error('Error in staffService.create:', error);
      throw error;
    }
  },

  async update(where: { id: string }, data: any) {
    try {
      const db = await getDatabase();
      const { id, ...rest } = data;
      await db.collection(COLLECTIONS.STAFF).updateOne(
        { _id: new ObjectId(where.id) },
        { $set: rest }
      );
      return { id: where.id, ...rest };
    } catch (error) {
      console.error('Error in staffService.update:', error);
      throw error;
    }
  },

  async updateMany(where: any, data: any) {
    try {
      const db = await getDatabase();
      const query: any = {};
      
      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          query[key] = value;
        }
      });

      const result = await db.collection(COLLECTIONS.STAFF).updateMany(query, { $set: data });
      return { count: result.modifiedCount };
    } catch (error) {
      console.error('Error in staffService.updateMany:', error);
      throw error;
    }
  },

  async deleteMany(where: any) {
    try {
      const db = await getDatabase();
      const query: any = {};
      
      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          query[key] = value;
        }
      });

      const result = await db.collection(COLLECTIONS.STAFF).deleteMany(query);
      return { count: result.deletedCount };
    } catch (error) {
      console.error('Error in staffService.deleteMany:', error);
      throw error;
    }
  },

  async count(where?: any) {
    try {
      const db = await getDatabase();
      const query: any = where || {};
      return await db.collection(COLLECTIONS.STAFF).countDocuments(query);
    } catch (error) {
      console.error('Error in staffService.count:', error);
      throw error;
    }
  },
};

// ============ ACADEMIC YEAR OPERATIONS ============

export const academicYearService = {
  async findMany(params?: { where?: any; orderBy?: any }) {
    try {
      const db = await getDatabase();
      const query: any = params?.where || {};

      let cursor = db.collection(COLLECTIONS.ACADEMIC_YEARS).find(query);

      if (params?.orderBy) {
        const sort: any = {};
        Object.entries(params.orderBy).forEach(([key, value]) => {
          sort[key] = value === 'asc' ? 1 : -1;
        });
        cursor = cursor.sort(sort);
      }

      const results = await cursor.toArray();
      return results.map(docWithId);
    } catch (error) {
      console.error('Error in academicYearService.findMany:', error);
      throw error;
    }
  },

  async findUnique(where: { id: string }) {
    try {
      const db = await getDatabase();
      const doc = await db.collection(COLLECTIONS.ACADEMIC_YEARS).findOne({ _id: new ObjectId(where.id) });
      return docWithId(doc);
    } catch (error) {
      console.error('Error in academicYearService.findUnique:', error);
      throw error;
    }
  },

  async create(data: any) {
    try {
      const db = await getDatabase();
      const { id, ...rest } = data;
      const result = await db.collection(COLLECTIONS.ACADEMIC_YEARS).insertOne({
        ...rest,
        createdAt: new Date(),
      });
      return { id: result.insertedId.toString(), ...rest };
    } catch (error) {
      console.error('Error in academicYearService.create:', error);
      throw error;
    }
  },

  async update(where: { id: string }, data: any) {
    try {
      const db = await getDatabase();
      const { id, ...rest } = data;
      await db.collection(COLLECTIONS.ACADEMIC_YEARS).updateOne(
        { _id: new ObjectId(where.id) },
        { $set: rest }
      );
      return { id: where.id, ...rest };
    } catch (error) {
      console.error('Error in academicYearService.update:', error);
      throw error;
    }
  },

  async delete(where: { id: string }) {
    try {
      const db = await getDatabase();
      await db.collection(COLLECTIONS.ACADEMIC_YEARS).deleteOne({ _id: new ObjectId(where.id) });
      return { success: true };
    } catch (error) {
      console.error('Error in academicYearService.delete:', error);
      throw error;
    }
  },
};

// ============ SUBJECT OPERATIONS ============

export const subjectService = {
  async findMany(params?: { where?: any; include?: any; orderBy?: any }) {
    try {
      const db = await getDatabase();
      const query: any = params?.where || {};

      let cursor = db.collection(COLLECTIONS.SUBJECTS).find(query);

      if (params?.orderBy) {
        const sort: any = {};
        Object.entries(params.orderBy).forEach(([key, value]) => {
          sort[key] = value === 'asc' ? 1 : -1;
        });
        cursor = cursor.sort(sort);
      }

      let results = await cursor.toArray();
      results = results.map(docWithId);

      if (params?.include?.academicYear) {
        for (const subject of results) {
          if (subject.academicYearId) {
            const year = await academicYearService.findUnique({ id: subject.academicYearId });
            subject.academicYear = year;
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error in subjectService.findMany:', error);
      throw error;
    }
  },

  async findUnique(where: { id: string }) {
    try {
      const db = await getDatabase();
      const doc = await db.collection(COLLECTIONS.SUBJECTS).findOne({ _id: new ObjectId(where.id) });
      return docWithId(doc);
    } catch (error) {
      console.error('Error in subjectService.findUnique:', error);
      throw error;
    }
  },

  async create(data: any) {
    try {
      const db = await getDatabase();
      const { id, ...rest } = data;
      const result = await db.collection(COLLECTIONS.SUBJECTS).insertOne({
        ...rest,
        createdAt: new Date(),
      });
      return { id: result.insertedId.toString(), ...rest };
    } catch (error) {
      console.error('Error in subjectService.create:', error);
      throw error;
    }
  },

  async update(where: { id: string }, data: any) {
    try {
      const db = await getDatabase();
      const { id, ...rest } = data;
      await db.collection(COLLECTIONS.SUBJECTS).updateOne(
        { _id: new ObjectId(where.id) },
        { $set: rest }
      );
      return { id: where.id, ...rest };
    } catch (error) {
      console.error('Error in subjectService.update:', error);
      throw error;
    }
  },

  async delete(where: { id: string }) {
    try {
      const db = await getDatabase();
      await db.collection(COLLECTIONS.SUBJECTS).deleteOne({ _id: new ObjectId(where.id) });
      return { success: true };
    } catch (error) {
      console.error('Error in subjectService.delete:', error);
      throw error;
    }
  },

  async count(where?: any) {
    try {
      const db = await getDatabase();
      const query: any = where || {};
      return await db.collection(COLLECTIONS.SUBJECTS).countDocuments(query);
    } catch (error) {
      console.error('Error in subjectService.count:', error);
      throw error;
    }
  },
};

// ============ ASSIGNMENT OPERATIONS ============

export const assignmentService = {
  async createMany(data: any[]) {
    try {
      const db = await getDatabase();
      const docs = data.map(item => ({
        ...item,
        createdAt: new Date(),
      }));
      const result = await db.collection(COLLECTIONS.FACULTY_ASSIGNMENTS).insertMany(docs);
      return { count: Object.keys(result.insertedIds).length };
    } catch (error) {
      console.error('Error in assignmentService.createMany:', error);
      throw error;
    }
  },

  async findMany(params?: { where?: any; include?: any }) {
    try {
      const db = await getDatabase();
      const query: any = params?.where || {};

      const results = await db.collection(COLLECTIONS.FACULTY_ASSIGNMENTS).find(query).toArray();
      let assignments = results.map(docWithId);

      if (params?.include) {
        for (const assignment of assignments) {
          if (params.include.subject && assignment.subjectId) {
            const subject = await subjectService.findUnique({ id: assignment.subjectId });
            assignment.subject = subject;
          }
          if (params.include._count?.feedback !== undefined) {
            const feedbackCount = await db.collection(COLLECTIONS.FEEDBACK).countDocuments({
              staffId: assignment.staffId,
              subjectId: assignment.subjectId,
              semester: assignment.semester,
            });
            assignment._count = { feedback: feedbackCount };
          }
        }
      }

      return assignments;
    } catch (error) {
      console.error('Error in assignmentService.findMany:', error);
      throw error;
    }
  },

  async deleteMany(where: any) {
    try {
      const db = await getDatabase();
      const query: any = {};
      
      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          query[key] = value;
        }
      });

      const result = await db.collection(COLLECTIONS.FACULTY_ASSIGNMENTS).deleteMany(query);
      return { count: result.deletedCount };
    } catch (error) {
      console.error('Error in assignmentService.deleteMany:', error);
      throw error;
    }
  },
};

// ============ FEEDBACK OPERATIONS ============

export const feedbackService = {
  async create(data: any) {
    try {
      const db = await getDatabase();
      const { id, ...rest } = data;
      const result = await db.collection(COLLECTIONS.FEEDBACK).insertOne({
        ...rest,
        submittedAt: new Date(),
      });
      return { id: result.insertedId.toString(), ...rest };
    } catch (error) {
      console.error('Error in feedbackService.create:', error);
      throw error;
    }
  },

  async findFirst(where: any) {
    try {
      const db = await getDatabase();
      const doc = await db.collection(COLLECTIONS.FEEDBACK).findOne(where);
      return docWithId(doc);
    } catch (error) {
      console.error('Error in feedbackService.findFirst:', error);
      throw error;
    }
  },

  async findMany(params?: { where?: any; include?: any; orderBy?: any }) {
    try {
      const db = await getDatabase();
      const query: any = params?.where || {};

      let cursor = db.collection(COLLECTIONS.FEEDBACK).find(query);

      if (params?.orderBy) {
        const sort: any = {};
        Object.entries(params.orderBy).forEach(([key, value]) => {
          sort[key] = value === 'asc' ? 1 : -1;
        });
        cursor = cursor.sort(sort);
      }

      let results = await cursor.toArray();
      results = results.map(docWithId);

      if (params?.include) {
        for (const feedback of results) {
          if (params.include.student && feedback.studentId) {
            const student = await userService.findUnique({ id: feedback.studentId });
            feedback.student = student;
          }
          if (params.include.staff && feedback.staffId) {
            const staff = await staffService.findUnique({ where: { id: feedback.staffId }, include: { user: true } });
            feedback.staff = staff;
          }
          if (params.include.subject && feedback.subjectId) {
            const subject = await subjectService.findUnique({ id: feedback.subjectId });
            feedback.subject = subject;
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error in feedbackService.findMany:', error);
      throw error;
    }
  },

  async count(where?: any) {
    try {
      const db = await getDatabase();
      return await db.collection(COLLECTIONS.FEEDBACK).countDocuments(where || {});
    } catch (error) {
      console.error('Error in feedbackService.count:', error);
      throw error;
    }
  },

  async updateMany(where: any, data: any) {
    try {
      const db = await getDatabase();
      const query: any = {};
      
      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          query[key] = value;
        }
      });

      const result = await db.collection(COLLECTIONS.FEEDBACK).updateMany(query, { $set: data });
      return { count: result.modifiedCount };
    } catch (error) {
      console.error('Error in feedbackService.updateMany:', error);
      throw error;
    }
  },
};

// ============ HOD SUGGESTION OPERATIONS ============

export const hodSuggestionService = {
  async create(data: any) {
    try {
      const db = await getDatabase();
      const { id, ...rest } = data;
      const result = await db.collection(COLLECTIONS.HOD_SUGGESTIONS).insertOne({
        ...rest,
        createdAt: new Date(),
      });
      return { id: result.insertedId.toString(), ...rest };
    } catch (error) {
      console.error('Error in hodSuggestionService.create:', error);
      throw error;
    }
  },

  async findMany(params?: { where?: any }) {
    try {
      const db = await getDatabase();
      const query: any = params?.where || {};

      const results = await db.collection(COLLECTIONS.HOD_SUGGESTIONS).find(query).toArray();
      return results.map(docWithId);
    } catch (error) {
      console.error('Error in hodSuggestionService.findMany:', error);
      throw error;
    }
  },

  async findUnique(where: { id?: string; staffId_semester?: { staffId: string; semester: string } }) {
    try {
      const db = await getDatabase();
      let query: any = {};
      if (where.id) {
        query._id = new ObjectId(where.id);
      } else if (where.staffId_semester) {
        const { staffId, semester } = where.staffId_semester;
        query = { staffId, semester };
      }
      const doc = await db.collection(COLLECTIONS.HOD_SUGGESTIONS).findOne(query);
      return docWithId(doc);
    } catch (error) {
      console.error('Error in hodSuggestionService.findUnique:', error);
      throw error;
    }
  },

  async deleteMany(where: any) {
    try {
      const db = await getDatabase();
      const query: any = {};
      
      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          query[key] = value;
        }
      });

      const result = await db.collection(COLLECTIONS.HOD_SUGGESTIONS).deleteMany(query);
      return { count: result.deletedCount };
    } catch (error) {
      console.error('Error in hodSuggestionService.deleteMany:', error);
      throw error;
    }
  },
};

export const semesterSettingsService = {
  async get() {
    try {
      const db = await getDatabase();
      const doc = await db.collection(COLLECTIONS.SETTINGS).findOne({ type: 'semester' });
      if (!doc) {
        const defaultSettings = {
          type: 'semester',
          currentSemester: 1,
          academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1).toString().slice(-2),
          updatedAt: new Date(),
        };
        await db.collection(COLLECTIONS.SETTINGS).insertOne(defaultSettings);
        return { ...defaultSettings, id: defaultSettings._id?.toString() };
      }
      return docWithId(doc);
    } catch (error) {
      console.error('Error in semesterSettingsService.get:', error);
      throw error;
    }
  },

  async update(data: { currentSemester: number; academicYear?: string }) {
    try {
      const db = await getDatabase();
      const updateData: any = {
        currentSemester: data.currentSemester,
        updatedAt: new Date(),
      };
      if (data.academicYear) {
        updateData.academicYear = data.academicYear;
      }
      await db.collection(COLLECTIONS.SETTINGS).updateOne(
        { type: 'semester' },
        { $set: updateData },
        { upsert: true }
      );
      return this.get();
    } catch (error) {
      console.error('Error in semesterSettingsService.update:', error);
      throw error;
    }
  },

  getCurrentSemesterString(semesterNumber: number, year?: string) {
    const isOdd = semesterNumber % 2 === 1;
    const semesterType = isOdd ? 'Odd' : 'Even';
    const academicYear = year || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1).toString().slice(-2);
    return `${semesterType} Semester ${academicYear}`;
  },
};

export { timestampToDate };
