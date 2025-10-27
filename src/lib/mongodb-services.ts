import { getDatabase } from './mongodb';
import { ObjectId } from 'mongodb';

// Collection names
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
// Convert a MongoDB document's _id to id (string) and normalize any ObjectId fields to strings
const docWithId = (doc: any) => {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  // Convert any ObjectId values in the rest to strings so callers get consistent types
  Object.keys(rest).forEach((k) => {
    const v = rest[k];
    if (v && typeof v === 'object') {
      // single ObjectId
      if (v instanceof ObjectId) rest[k] = v.toString();
      // arrays containing ObjectId
      else if (Array.isArray(v)) {
        rest[k] = v.map((it: any) => (it instanceof ObjectId ? it.toString() : it));
      }
    }
  });
  return { id: _id?.toString(), ...rest };
};

// Helper to build a mongo query from a flexible `where` object.
// If `where.id` is present we query by _id ObjectId. Otherwise the keys are passed through.
const buildQueryFromWhere = (where: any) => {
  const query: any = {};
  if (!where) return query;
  if (where.id) {
    try {
      query._id = new ObjectId(where.id);
      return query;
    } catch (e) {
      // fallthrough - if id isn't a valid ObjectId, leave as string match
      query._id = where.id;
      return query;
    }
  }
  Object.entries(where).forEach(([key, value]) => {
    if (value !== undefined) query[key] = value;
  });
  return query;
};

// Helper to handle date objects
const timestampToDate = (timestamp: any) => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  return new Date(timestamp);
};

// Normalize semester strings into a canonical format: "Odd Semester 2025-26" or "Even Semester 2025-26"
export const normalizeSemester = (semester: any) => {
  if (!semester && semester !== 0) return semester;
  let s = String(semester).trim();
  // If it's already like 'Odd Semester 2025-26' normalize spacing
  const m = s.match(/(Odd|Even)\s*(?:Semester)?\s*(\d{4}(?:-|–)\d{2})/i);
  if (m) {
    const type = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
    const year = m[2];
    return `${type} Semester ${year}`;
  }
  // If it is numeric like 1..6, attempt to map to Odd/Even with current year
  const num = parseInt(s, 10);
  if (!isNaN(num) && num >= 1 && num <= 6) {
    const isOdd = num % 2 === 1;
    const yearStr = `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`;
    return `${isOdd ? 'Odd' : 'Even'} Semester ${yearStr}`;
  }
  return s;
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
  // allow lookup by subjectCode
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
      // If a departmentId is provided, store both legacy `departmentId` and a `departmentIds` array
      const docToInsert: any = { ...rest, createdAt: new Date() };
      if (rest.departmentId) {
        docToInsert.departmentId = rest.departmentId;
        docToInsert.departmentIds = Array.isArray(rest.departmentIds) ? Array.from(new Set([...(rest.departmentIds || []), rest.departmentId])) : [rest.departmentId];
      }

      const result = await db.collection(COLLECTIONS.SUBJECTS).insertOne(docToInsert);
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
      // Coerce '*Id' filters to match ObjectId or string (keeps behavior consistent with findMany)
      const query: any = {};
      if (where) {
        Object.entries(where).forEach(([key, value]) => {
          if (value === undefined) return;
          if (key === 'departmentId') {
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

      return await db.collection(COLLECTIONS.SUBJECTS).countDocuments(query);
    } catch (error) {
      console.error('Error in subjectService.count:', error);
      throw error;
    }
  },
};

// ============ DEPARTMENT-SUBJECT JUNCTION OPERATIONS ============

// Normalize academicYearId values: convert the string 'null' to actual null
const normalizeAcademicYearId = (ay: any) => {
  if (ay === undefined || ay === null) return null;
  if (typeof ay === 'string') {
    const trimmed = ay.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'null') return null;
    return trimmed;
  }
  return ay;
};

export const departmentSubjectsService = {
  // Return subject documents for a department. options may include { include: { academicYear: true } }
  async findSubjectsForDepartment(departmentId: string, options?: { include?: any }) {
    try {
      const db = await getDatabase();
      if (!departmentId) return [];
      const depIdStr = String(departmentId);

      // Early debug logging to trace why newly-created junction rows may not be found
      try {
        console.log('🔍 findSubjectsForDepartment CALLED:');
        console.log('  Department ID:', departmentId);
        console.log('  Options:', JSON.stringify(options));
        console.log('  DepIdStr:', depIdStr);
      } catch (e) {
        // ignore logging errors
      }

      // 1) fetch all departmentSubjects rows for this department
      const rows = await db.collection(COLLECTIONS.DEPARTMENT_SUBJECTS).find({ departmentId: depIdStr }).toArray();
      if (!rows || rows.length === 0) return [];

      // 2) fetch all subject docs referenced by those rows (unique set)
      const subjectIdStrs = Array.from(new Set(rows.map((r: any) => String(r.subjectId)).filter(Boolean)));
      const objectIds: any[] = [];
      const stringIds: any[] = [];
      for (const sid of subjectIdStrs) {
        if (/^[0-9a-fA-F]{24}$/.test(sid)) {
          try { objectIds.push(new ObjectId(sid)); } catch (e) { stringIds.push(sid); }
        } else {
          stringIds.push(sid);
        }
      }

      const orClauses: any[] = [];
      if (objectIds.length) orClauses.push({ _id: { $in: objectIds } });
      if (stringIds.length) orClauses.push({ _id: { $in: stringIds } });

      const subjectsRaw = (orClauses.length === 0) ? [] : await db.collection(COLLECTIONS.SUBJECTS).find(orClauses.length === 1 ? orClauses[0] : { $or: orClauses }).toArray();
      const subjectMap: any = {};
      subjectsRaw.forEach((s: any) => { subjectMap[s._id?.toString() || s.id] = docWithId(s); });

      // 3) optionally fetch academic years referenced in rows OR on the master subject
      const academicYearMap: any = {};
      if (options?.include?.academicYear) {
        // include academicYearIds from junction rows
        const rowAyIds = rows.map(r => normalizeAcademicYearId(r.academicYearId)).filter(Boolean);
        // include academicYearIds from the master subject documents as a fallback source
        const subjectAyIds = subjectsRaw.map((s: any) => normalizeAcademicYearId(s.academicYearId)).filter(Boolean);
        const ayIds = Array.from(new Set([...rowAyIds, ...subjectAyIds]));
        const ayObjectIds: any[] = [];
        const ayStringIds: any[] = [];
        for (const aid of ayIds) {
          if (/^[0-9a-fA-F]{24}$/.test(aid)) {
            try { ayObjectIds.push(new ObjectId(aid)); } catch (e) { ayStringIds.push(aid); }
          } else {
            ayStringIds.push(aid);
          }
        }
        const ayOr: any[] = [];
        if (ayObjectIds.length) ayOr.push({ _id: { $in: ayObjectIds } });
        if (ayStringIds.length) ayOr.push({ _id: { $in: ayStringIds } });
        if (ayOr.length) {
          const ayDocs = await db.collection(COLLECTIONS.ACADEMIC_YEARS).find(ayOr.length === 1 ? ayOr[0] : { $or: ayOr }).toArray();
          ayDocs.forEach((ay: any) => {
            // store a normalized academic year object including both _id and id as strings
            academicYearMap[ay._id.toString()] = {
              _id: ay._id.toString(),
              id: ay._id.toString(),
              name: ay.name,
              abbreviation: ay.abbreviation,
              year: ay.year,
              departmentId: ay.departmentId ? String(ay.departmentId) : undefined,
            };
          });
        }
      }

      // 4) Build results: one entry per departmentSubjects row, enriched with subject and optionally academicYear
      // Build ONE result per departmentSubjects row with full subject fields and junction metadata
      const results = rows.map((r: any) => {
        const subj = subjectMap[r.subjectId];
        if (!subj) return null;

        const normalizedAYId = normalizeAcademicYearId(r.academicYearId);

        const result: any = {
          // Subject identity
          _id: subj.id,
          id: subj.id,
          name: subj.name,
          subjectCode: subj.subjectCode,
          semester: subj.semester,
          departmentId: subj.departmentId || depIdStr,

          // academicYear will be filled below if requested
          academicYear: null,

          // junction metadata
          _junctionId: r._id?.toString(),
          createdAt: r.createdAt ? timestampToDate(r.createdAt) : (subj.createdAt ? timestampToDate(subj.createdAt) : null),
          updatedAt: r.updatedAt ? timestampToDate(r.updatedAt) : (subj.updatedAt ? timestampToDate(subj.updatedAt) : null),
        };

        if (options?.include?.academicYear) {
          if (normalizedAYId) {
            result.academicYear = academicYearMap[normalizedAYId] || null;
          } else if (subj && subj.academicYearId) {
            // If the junction row lacks an academicYear, fall back to the master subject's academicYear
            result.academicYear = academicYearMap[subj.academicYearId] || null;
          } else {
            result.academicYear = null;
          }
        }

        return result;
      }).filter(Boolean);

      // Debug: log sample of results to help frontend mapping
      try {
        console.debug('findSubjectsForDepartment results count:', results.length);
        if (results.length) console.debug('findSubjectsForDepartment first sample:', results[0]);
      } catch (e) {
        // ignore logging errors
      }

      // Additional verbose logging requested for debugging frontend mismatch
      try {
        console.log('🔍 findSubjectsForDepartment DEBUG:');
        console.log('  Department ID:', departmentId);
        console.log('  Results count:', results.length);
        if (results.length > 0) {
          console.log('  First result sample:', JSON.stringify(results[0], null, 2));
        }
      } catch (e) {
        // swallow logging errors to avoid affecting runtime
      }

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
      const doc: any = {
        departmentId: String(departmentId),
        subjectId: String(subjectId),
        academicYearId: normalizeAcademicYearId(academicYearId),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      try {
        const res = await db.collection(COLLECTIONS.DEPARTMENT_SUBJECTS).insertOne(doc);
        return { insertedId: res.insertedId?.toString(), created: true };
      } catch (err: any) {
        // duplicate key -> already exists
        if (err && err.code === 11000) {
          return { created: false, reason: 'already_exists' };
        }
        throw err;
      }
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
