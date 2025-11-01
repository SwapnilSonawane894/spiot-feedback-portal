import { getDatabase } from './mongodb';
import { CACHE_KEYS, getCacheKey, getCachedOrFetch, invalidateCache } from './cache-utils';
import { ObjectId } from 'mongodb';

// Collection names
import { getStudentTasksFromDb } from './student-tasks';

export { getStudentTasksFromDb };  // Re-export for easier imports

export const COLLECTIONS = {
  USERS: 'users',
  DEPARTMENTS: 'departments',
  STAFF: 'staff',
  ACADEMIC_YEARS: 'academicYears',
  SUBJECTS: 'subjects',
  DEPARTMENT_SUBJECTS: 'departmentSubjects',
  FACULTY_ASSIGNMENTS: 'facultyAssignments',
  FEEDBACK: 'feedback',
  HOD_SUGGESTIONS: 'hodSuggestions',
  SETTINGS: 'settings',
};

// Helper to convert MongoDB _id to id
const docWithId = (doc: any) => {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id?.toString(), ...rest };
};

// Helper to handle date objects
const timestampToDate = (timestamp: any) => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  return new Date(timestamp);
};

// Normalize academicYearId values that may be stored as ObjectId, string or nested object
export const normalizeAcademicYearId = (aid: any) => {
  if (!aid) return null;
  try {
    if (typeof aid === 'string') return aid;
    if (aid && typeof aid === 'object' && aid._id) return String(aid._id);
    if (aid && typeof aid === 'object' && typeof aid.toString === 'function') return aid.toString();
    return String(aid);
  } catch (e) {
    return null;
  }
};

// Normalize semester representation (prefer number when possible)
export const normalizeSemester = (s: any) => {
  if (s === undefined || s === null) return s;

  // If it's already a number, keep it as number
  if (typeof s === 'number') return s;

  // Coerce numeric strings to actual numbers
  if (typeof s === 'string') {
    const trimmed = s.trim();
    const maybeNum = Number(trimmed);
    if (Number.isFinite(maybeNum) && String(maybeNum) !== 'NaN') return maybeNum;

    // Normalize common textual semester forms:
    // - "Odd Semester 2025-26"  -> "Odd 2025-26"
    // - collapse multiple spaces and remove the word 'Semester' (case-insensitive)
    const cleaned = trimmed.replace(/\bSemester\b/ig, '').replace(/\s+/g, ' ').trim();
    return cleaned;
  }

  // Fallback: try numeric coercion, otherwise return original
  const n = Number(s);
  return Number.isFinite(n) ? n : s;
};

export const userService = {
  async findUnique(where: { email?: string; id?: string }) {
    try {
      const db = await getDatabase();
      let query: any = {};
      
      if (where.id) {
        try { query._id = new ObjectId(where.id); } catch { query._id = where.id; }
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
              try { query._id = new ObjectId(value as string); } catch { query._id = value; }
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

      if (params?.limit) cursor = cursor.limit(params.limit);

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
        if (value !== undefined) query[key] = value;
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
        if (value !== undefined) query[key] = value;
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
      // Coerce where filters: if a filter key endsWith 'Id' and the value is a 24-char hex string,
      // convert it to an ObjectId so it matches documents that store references as ObjectId.
      const query: any = {};
      if (params?.where) {
        Object.entries(params.where).forEach(([key, value]) => {
          if (value === undefined) return;
          if (typeof value === 'string' && /Id$/.test(key) && /^[0-9a-fA-F]{24}$/.test(value)) {
            try {
                query[key] = { $in: [ new ObjectId(value), value ] };
            } catch (e) {
              query[key] = value;
            }
          } else {
            query[key] = value;
          }
        });
      }

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
        // tolerate ids that are not valid ObjectId strings
        try {
          query._id = new ObjectId(params.where.id);
        } catch (e) {
          // fallback to string match if not a 24-char hex
          query._id = params.where.id;
        }
      } else if (params.where.userId) {
        // allow match when staff.userId is stored as ObjectId or as string
        const uid = params.where.userId;
        if (typeof uid === 'string' && /^[0-9a-fA-F]{24}$/.test(uid)) {
          try {
            query.userId = { $in: [ new ObjectId(uid), uid ] };
          } catch (e) {
            query.userId = uid;
          }
        } else {
          query.userId = uid;
        }
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
      // Build query and coerce '*Id' filters to match ObjectId or string
      const query: any = {};
      if (params?.where) {
        Object.entries(params.where).forEach(([key, value]) => {
          if (value === undefined) return;
          // Special-case departmentId: allow matching either a single departmentId field or membership in departmentIds array
          if (key === 'departmentId') {
            // build a clause that matches either departmentId === value OR departmentIds contains value
            if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) {
              try {
                const obj = new ObjectId(value);
                query['$or'] = [{ departmentId: { $in: [obj, value] } }, { departmentIds: { $in: [obj, value] } }];
              } catch (e) {
                query['$or'] = [{ departmentId: value }, { departmentIds: value }];
              }
            } else {
              query['$or'] = [{ departmentId: value }, { departmentIds: value }];
            }
            return;
          }

          if (typeof value === 'string' && /Id$/.test(key) && /^[0-9a-fA-F]{24}$/.test(value)) {
            try {
              query[key] = { $in: [ new ObjectId(value), value ] };
            } catch (e) {
              query[key] = value;
            }
          } else {
            query[key] = value;
          }
        });
      }

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
  async findUniqueByCode(subjectCode: string) {
    try {
      const db = await getDatabase();
      const doc = await db.collection(COLLECTIONS.SUBJECTS).findOne({ subjectCode });
      return docWithId(doc);
    } catch (error) {
      console.error('Error in subjectService.findUniqueByCode:', error);
      throw error;
    }
  },

  async create(data: any) {
    try {
      const db = await getDatabase();
      const { id, ...rest } = data;
      // normalize academicYearId before persisting to avoid future mismatches
      const toInsert = { ...rest, createdAt: new Date() };
      if (toInsert.academicYearId) toInsert.academicYearId = normalizeAcademicYearId(toInsert.academicYearId);
      const result = await db.collection(COLLECTIONS.SUBJECTS).insertOne(toInsert);
      return { id: result.insertedId.toString(), ...toInsert };
    } catch (error) {
      console.error('Error in subjectService.create:', error);
      throw error;
    }
  },

  async update(where: { id: string }, data: any) {
    try {
      const db = await getDatabase();
      const { id, ...rest } = data;
      const toSet: any = { ...rest };
      if (toSet.academicYearId) toSet.academicYearId = normalizeAcademicYearId(toSet.academicYearId);
      await db.collection(COLLECTIONS.SUBJECTS).updateOne({ _id: new ObjectId(where.id) }, { $set: toSet });
      return { id: where.id, ...toSet };
    } catch (error) {
      console.error('Error in subjectService.update:', error);
      throw error;
    }
  },
  
};

export const departmentSubjectsService = {
  async findSubjectsForDepartment(departmentId: string, options?: { include?: any }) {
    try {
      const db = await getDatabase();
      if (!departmentId) return [];
      const depIdStr = String(departmentId);

      console.log('🔍 [departmentSubjectsService] Finding subjects for department:', depIdStr);

      // 1) Fetch junction rows
      const junctions = await db.collection(COLLECTIONS.DEPARTMENT_SUBJECTS)
        .find({ departmentId: depIdStr })
        .toArray();
      
      if (!junctions || junctions.length === 0) {
        console.log('❌ [departmentSubjectsService] No junction rows found for department');
        return [];
      }

      // 2) Extract IDs and convert to ObjectIds
      const yearIds: ObjectId[] = [];
      const subjectIds: ObjectId[] = [];

      for (const junction of junctions) {
        if (junction.academicYearId) {
          try {
            yearIds.push(new ObjectId(String(junction.academicYearId)));
          } catch {}
        }
        if (junction.subjectId) {
          try {
            subjectIds.push(new ObjectId(String(junction.subjectId)));
          } catch {}
        }
      }

      // 3) Fetch academic years and subjects in parallel
      const [years, subjects] = await Promise.all([
        db.collection(COLLECTIONS.ACADEMIC_YEARS)
          .find({ _id: { $in: yearIds } })
          .toArray(),
        db.collection(COLLECTIONS.SUBJECTS)
          .find({ _id: { $in: subjectIds } })
          .toArray()
      ]);
      // Build maps for lookups
      const yearMap = new Map(years.map(year => [String(year._id), year]));
      const subjectMap = new Map(subjects.map(subject => [
        String(subject._id), {
          id: String(subject._id),
          _id: String(subject._id),
          name: subject.name,
          subjectCode: subject.subjectCode,
          semester: subject.semester,
          departmentId: subject.departmentId,
          createdAt: subject.createdAt,
          updatedAt: subject.updatedAt
        }
      ]));

      // Build results from junction data
      const results = junctions.map(junction => {
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
          academicYear: academicYear,
          createdAt: timestampToDate(junction.createdAt) || timestampToDate(subject.createdAt),
          updatedAt: timestampToDate(junction.updatedAt) || timestampToDate(subject.updatedAt),
        };
      }).filter(Boolean);

      return results;
    } catch (error) {
      console.error('Error in departmentSubjectsService.findSubjectsForDepartment:', error);
      throw error;
    }
  },

  // Link a subject to a department (graceful if already exists)
  async linkSubjectToDepartment({ departmentId, subjectId, academicYearId }: { departmentId: string; subjectId: string; academicYearId?: any }) {
    try {
      const db = await getDatabase();
      // Basic validation: departmentId and subjectId must be provided and not the literal 'undefined'
      if (!departmentId || String(departmentId).trim() === '' || String(departmentId) === 'undefined') {
        throw new Error('Invalid departmentId provided to linkSubjectToDepartment');
      }
      if (!subjectId || String(subjectId).trim() === '' || String(subjectId) === 'undefined') {
        throw new Error('Invalid subjectId provided to linkSubjectToDepartment');
      }

      // Verify referenced subject exists before creating the junction. This prevents orphan links.
      // Build a safe filter: try ObjectId form then string form
      let objId: any = null;
      try { objId = new ObjectId(String(subjectId)); } catch (e) { objId = null; }
      const orFilters: any[] = [];
      if (objId) orFilters.push({ _id: objId });
      orFilters.push({ _id: String(subjectId) });
      const subj = orFilters.length === 1 ? await db.collection(COLLECTIONS.SUBJECTS).findOne(orFilters[0]) : await db.collection(COLLECTIONS.SUBJECTS).findOne({ $or: orFilters });
      if (!subj) {
        throw new Error('Cannot link: subject not found for subjectId=' + String(subjectId));
      }

      const doc: any = {
        departmentId: String(departmentId),
        subjectId: String(subjectId),
        academicYearId: normalizeAcademicYearId(academicYearId),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Use replaceOne with upsert so repeated calls do not create duplicates and existing rows are normalized
  const res = await db.collection(COLLECTIONS.DEPARTMENT_SUBJECTS).replaceOne({ departmentId: String(departmentId), subjectId: String(subjectId) }, doc, { upsert: true });
  // res.upsertedId may be returned as an ObjectId; treat presence as 'created'
  const created = Boolean((res as any).upsertedId);
  const upsertedIdStr = (res as any).upsertedId ? String((res as any).upsertedId) : undefined;
  return { created: created, upsertedId: upsertedIdStr };
    } catch (error) {
      console.error('Error in departmentSubjectsService.linkSubjectToDepartment:', error);
      throw error;
    }
  },

  async unlinkSubjectFromDepartment(departmentId: string, subjectId: string) {
    try {
      const db = await getDatabase();
      const res = await db.collection(COLLECTIONS.DEPARTMENT_SUBJECTS).deleteOne({ departmentId: String(departmentId), subjectId: String(subjectId) });
      return { deletedCount: res.deletedCount };
    } catch (error) {
      console.error('Error in departmentSubjectsService.unlinkSubjectFromDepartment:', error);
      throw error;
    }
  },

  async linkExists(departmentId: string, subjectId: string) {
    try {
      const db = await getDatabase();
      const found = await db.collection(COLLECTIONS.DEPARTMENT_SUBJECTS).findOne({ departmentId: String(departmentId), subjectId: String(subjectId) });
      return !!found;
    } catch (error) {
      console.error('Error in departmentSubjectsService.linkExists:', error);
      throw error;
    }
  },

  async countSubjectsForDepartment(departmentId: string) {
    try {
      const db = await getDatabase();
      return await db.collection(COLLECTIONS.DEPARTMENT_SUBJECTS).countDocuments({ departmentId: String(departmentId) });
    } catch (error) {
      console.error('Error in departmentSubjectsService.countSubjectsForDepartment:', error);
      throw error;
    }
  },

  async findDepartmentsForSubject(subjectId: string) {
    try {
      const db = await getDatabase();
      const rows = await db.collection(COLLECTIONS.DEPARTMENT_SUBJECTS).find({ subjectId: String(subjectId) }).toArray();
      return rows.map((r: any) => String(r.departmentId));
    } catch (error) {
      console.error('Error in departmentSubjectsService.findDepartmentsForSubject:', error);
      throw error;
    }
  }
};


// ============ ASSIGNMENT OPERATIONS ============

export const assignmentService = {
  async createMany(payload: any) {
    try {
      const db = await getDatabase();
      
      // Clear cache since assignments are changing
      invalidateCache(CACHE_KEYS.STUDENT_TASKS);
      invalidateCache(CACHE_KEYS.FACULTY_ASSIGNMENTS);
      
      // payload may be an array or an object like { data: [] }
      const dataArray = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
      // normalize semester at write time to prevent semantically-duplicate documents
      const docs = dataArray.map((item: any) => ({
        ...item,
        semester: normalizeSemester(item.semester),
        // ensure id-like fields are stored as strings
        staffId: item.staffId ? String(item.staffId) : item.staffId,
        subjectId: item.subjectId ? String(item.subjectId) : item.subjectId,
        departmentId: item.departmentId ? String(item.departmentId) : item.departmentId,
        // normalize academicYearId at write time so queries can rely on a consistent shape
        academicYearId: item.academicYearId ? normalizeAcademicYearId(item.academicYearId) : item.academicYearId,
        createdAt: new Date(),
      }));
      if (docs.length === 0) return { count: 0 };
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
      // Build query with coercion for '*Id' fields to ObjectId when appropriate
      const query: any = {};
      if (params?.where) {
        Object.entries(params.where).forEach(([key, value]) => {
          if (value === undefined) return;
          if (key === 'semester') {
            query.semester = normalizeSemester(value);
            return;
          }
          if (typeof value === 'string' && /Id$/.test(key) && /^[0-9a-fA-F]{24}$/.test(value)) {
            try {
                query[key] = { $in: [ new ObjectId(value), value ] };
            } catch (e) {
              query[key] = value;
            }
          } else {
            query[key] = value;
          }
        });
      }

      const results = await db.collection(COLLECTIONS.FACULTY_ASSIGNMENTS).find(query).toArray();
      let assignments = results.map(docWithId);
  // normalize semester field on returned assignments
  assignments = assignments.map((a: any) => ({ ...a, semester: normalizeSemester(a.semester) }));

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
          query[key] = key === 'semester' ? normalizeSemester(value) : value;
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
        const defaultSettings: any = {
          type: 'semester',
          currentSemester: 1,
          academicYear: `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`,
          updatedAt: new Date(),
        };
        const result = await db.collection(COLLECTIONS.SETTINGS).insertOne(defaultSettings);
        defaultSettings.id = result.insertedId.toString();
        return defaultSettings;
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
      if (data.academicYear) updateData.academicYear = data.academicYear;
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
    const isOdd = Number(semesterNumber) % 2 === 1;
    const semesterType = isOdd ? 'Odd' : 'Even';
    const academicYear = year || `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`;
    return `${semesterType} Semester ${academicYear}`;
  },
};

export { timestampToDate };

// Robust centralized student task fetcher: handles ObjectId/string mismatches
// Student task fetching has been moved to ./student-tasks.ts

// Internal function that does the actual task fetching
// Student task fetching implementation has been moved to ./student-tasks.ts

async function _fetchStudentTasksOld(userId: string, options?: { groupBySubject?: boolean; allowAcademicYearFallback?: boolean }) {
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
        if (rowAyId && rowAyId === studentAcademicYearIdStr) {
          subjectIdsForYear.push(String(row.id));
        }
      }    const subjectIdsAll = Array.from(subjectIdsAllSet);

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
    if (subjectIdQueryValuesForYear.length > 0) {
      assignmentsStrict = await db.collection('facultyAssignments').find({
        subjectId: { $in: subjectIdQueryValuesForYear },
        academicYearId: { $in: academicYearIdQueryValues },
      }).toArray();
    } else {
      // No subject rows directly match the student's year. We'll keep strict set empty and
      // later fall back to showing same-subject other-year assignments (flagged).
      assignmentsStrict = [];
    }

    console.log(`--- [API LOG] assignments after subject+year (strict) filter: ${assignmentsStrict.length}`);

    // For diagnostics: what assignments were excluded because of academicYear mismatch?
    // If there were no year-matching subject rows, then the entire subject-matching set
    // is considered 'excluded by year' (we'll present them as flagged fallback below).
    let excludedByYear: any[] = [];
    if (assignmentsMatchingSubjectOnly.length) {
      const yearStrings = academicYearIdQueryValues.map(String);
      excludedByYear = assignmentsMatchingSubjectOnly.filter((a: any) => {
        const aid = a.academicYearId ? String(a.academicYearId) : null;
        // exclude those that already match the student's year
        if (aid && yearStrings.includes(aid)) return false;
        return true;
      });
    }
    if (excludedByYear.length) {
      console.log(`--- [API LOG] assignments excluded by academicYear (count=${excludedByYear.length}) sample:`, excludedByYear.slice(0, 10).map((a: any) => ({ _id: String(a._id), subjectId: a.subjectId, academicYearId: a.academicYearId })));
    }

    // If both strict assignments and excludedByYear are empty, nothing to return
    if (assignmentsStrict.length === 0 && excludedByYear.length === 0) return [];

    // Decide whether to append excluded (other-year) assignments as fallback.
    const allowFallback = Boolean(options?.allowAcademicYearFallback);

    let assignments: any[] = [];
    if (allowFallback) {
      // Combine strict matches (preferred) with excluded assignments as a fallback. Mark the
      // latter so the UI can indicate that they belong to a different academic year.
      const excludedFlagged = excludedByYear.map((a: any) => ({
        ...a,
        academicYearMismatch: true,
        assignmentAcademicYearId: a.academicYearId ? String(a.academicYearId) : null,
      }));

      // Merge and dedupe by _id
      const allMap = new Map<string, any>();
      for (const a of assignmentsStrict) allMap.set(String(a._id), a);
      for (const a of excludedFlagged) {
        if (!allMap.has(String(a._id))) allMap.set(String(a._id), a);
      }
      assignments = Array.from(allMap.values());
    } else {
      // Strict-only behavior (legacy): return only assignments that match student's year
      assignments = assignmentsStrict;
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
