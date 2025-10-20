import { getDb } from './mongodb';
import { ObjectId } from 'mongodb';

export const COLLECTIONS = {
  USERS: 'users',
  DEPARTMENTS: 'departments',
  STAFF: 'staff',
  ACADEMIC_YEARS: 'academicYears',
  SUBJECTS: 'subjects',
  FACULTY_ASSIGNMENTS: 'facultyAssignments',
  FEEDBACK: 'feedback',
  HOD_SUGGESTIONS: 'hodSuggestions',
};

const toObjectId = (id: string | ObjectId) => {
  if (typeof id === 'string') {
    return new ObjectId(id);
  }
  return id;
};

const docWithId = (doc: any) => {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
};

export const userService = {
  async findUnique(where: { email?: string; id?: string }) {
    const db = await getDb();
    let filter: any = {};
    
    if (where.id) {
      filter._id = toObjectId(where.id);
    } else if (where.email) {
      filter.email = where.email;
    } else {
      return null;
    }
    
    const doc = await db.collection(COLLECTIONS.USERS).findOne(filter);
    return docWithId(doc);
  },

  async findMany(params?: { where?: any; select?: any; orderBy?: any; limit?: number }) {
    const db = await getDb();
    let query: any = {};
    
    if (params?.where) {
      Object.entries(params.where).forEach(([key, value]) => {
        if (value !== undefined) {
          query[key] = value;
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
    
    const docs = await cursor.toArray();
    return docs.map(docWithId);
  },

  async create(data: any) {
    const db = await getDb();
    const result = await db.collection(COLLECTIONS.USERS).insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { id: result.insertedId.toString(), ...data };
  },

  async update(where: { id: string }, data: any) {
    const db = await getDb();
    await db.collection(COLLECTIONS.USERS).updateOne(
      { _id: toObjectId(where.id) },
      { $set: { ...data, updatedAt: new Date() } }
    );
    return { id: where.id, ...data };
  },

  async delete(where: { id: string }) {
    const db = await getDb();
    await db.collection(COLLECTIONS.USERS).deleteOne({ _id: toObjectId(where.id) });
  },
};

export const departmentService = {
  async findUnique(where: { id: string }) {
    const db = await getDb();
    const doc = await db.collection(COLLECTIONS.DEPARTMENTS).findOne({ _id: toObjectId(where.id) });
    return docWithId(doc);
  },

  async findMany(params?: { orderBy?: any; include?: any }) {
    const db = await getDb();
    let cursor = db.collection(COLLECTIONS.DEPARTMENTS).find({});
    
    if (params?.orderBy) {
      const sort: any = {};
      Object.entries(params.orderBy).forEach(([key, value]) => {
        sort[key] = value === 'asc' ? 1 : -1;
      });
      cursor = cursor.sort(sort);
    }
    
    const docs = await cursor.toArray();
    return docs.map(docWithId);
  },

  async create(data: any) {
    const db = await getDb();
    const result = await db.collection(COLLECTIONS.DEPARTMENTS).insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { id: result.insertedId.toString(), ...data };
  },

  async update(where: { id: string }, data: any) {
    const db = await getDb();
    await db.collection(COLLECTIONS.DEPARTMENTS).updateOne(
      { _id: toObjectId(where.id) },
      { $set: { ...data, updatedAt: new Date() } }
    );
    return { id: where.id, ...data };
  },

  async delete(where: { id: string }) {
    const db = await getDb();
    await db.collection(COLLECTIONS.DEPARTMENTS).deleteOne({ _id: toObjectId(where.id) });
  },
};

export const staffService = {
  async findUnique(params: { where: { id?: string; userId?: string }; include?: any }) {
    const db = await getDb();
    let filter: any = {};
    
    if (params.where.id) {
      filter._id = toObjectId(params.where.id);
    } else if (params.where.userId) {
      filter.userId = params.where.userId;
    } else {
      return null;
    }
    
    const doc = await db.collection(COLLECTIONS.STAFF).findOne(filter);
    if (!doc) return null;
    
    const staffData = docWithId(doc);
    
    if (params.include?.user && staffData.userId) {
      staffData.user = await userService.findUnique({ id: staffData.userId });
    }
    
    if (params.include?.department && staffData.departmentId) {
      staffData.department = await departmentService.findUnique({ id: staffData.departmentId });
    }
    
    return staffData;
  },

  async findFirst(params: { where: any; include?: any }) {
    const db = await getDb();
    const doc = await db.collection(COLLECTIONS.STAFF).findOne(params.where);
    if (!doc) return null;
    
    const staffData = docWithId(doc);
    
    if (params.include?.user && staffData.userId) {
      staffData.user = await userService.findUnique({ id: staffData.userId });
    }
    
    return staffData;
  },

  async findMany(params?: { where?: any; include?: any; orderBy?: any }) {
    const db = await getDb();
    let query: any = {};
    
    if (params?.where) {
      Object.entries(params.where).forEach(([key, value]: any) => {
        if (value !== undefined && typeof value !== 'object') {
          query[key] = value;
        }
      });
    }
    
    let cursor = db.collection(COLLECTIONS.STAFF).find(query);
    
    if (params?.orderBy) {
      const sort: any = {};
      Object.entries(params.orderBy).forEach(([key, value]) => {
        sort[key] = value === 'asc' ? 1 : -1;
      });
      cursor = cursor.sort(sort);
    }
    
    const docs = await cursor.toArray();
    const results = docs.map(docWithId);
    
    if (params?.include?.user) {
      for (const staff of results) {
        if (staff.userId) {
          staff.user = await userService.findUnique({ id: staff.userId });
        }
      }
    }
    
    if (params?.include?.department) {
      for (const staff of results) {
        if (staff.departmentId) {
          staff.department = await departmentService.findUnique({ id: staff.departmentId });
        }
      }
    }
    
    return results;
  },

  async create(data: any) {
    const db = await getDb();
    const result = await db.collection(COLLECTIONS.STAFF).insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { id: result.insertedId.toString(), ...data };
  },

  async update(where: { id: string }, data: any) {
    const db = await getDb();
    await db.collection(COLLECTIONS.STAFF).updateOne(
      { _id: toObjectId(where.id) },
      { $set: { ...data, updatedAt: new Date() } }
    );
    return { id: where.id, ...data };
  },

  async delete(where: { id: string }) {
    const db = await getDb();
    await db.collection(COLLECTIONS.STAFF).deleteOne({ _id: toObjectId(where.id) });
  },

  async count(where?: any) {
    const db = await getDb();
    let query: any = {};
    
    if (where) {
      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          query[key] = value;
        }
      });
    }
    
    return await db.collection(COLLECTIONS.STAFF).countDocuments(query);
  },
};

export const hodSuggestionService = {
  async deleteMany(where: any) {
    const db = await getDb();
    await db.collection(COLLECTIONS.HOD_SUGGESTIONS).deleteMany(where);
  },
};

export const assignmentService = {
  async deleteMany(where: any) {
    const db = await getDb();
    await db.collection(COLLECTIONS.FACULTY_ASSIGNMENTS).deleteMany(where);
  },

  async findMany(params: { where?: any; include?: any }) {
    const db = await getDb();
    let query: any = {};
    
    if (params.where) {
      Object.entries(params.where).forEach(([key, value]) => {
        if (value !== undefined) {
          query[key] = value;
        }
      });
    }
    
    const docs = await db.collection(COLLECTIONS.FACULTY_ASSIGNMENTS).find(query).toArray();
    return docs.map(docWithId);
  },
};
