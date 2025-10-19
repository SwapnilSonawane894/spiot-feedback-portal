import { firestore } from './firebase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

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
};

// Helper to convert Firestore Timestamp to Date
export const timestampToDate = (timestamp: any) => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return timestamp;
};

// Helper to add id to document data
export const docWithId = (doc: any) => {
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

// ============ USER OPERATIONS ============

export const userService = {
  async findUnique(where: { email?: string; id?: string }) {
    try {
      if (where.id) {
        const doc = await firestore.collection(COLLECTIONS.USERS).doc(where.id).get();
        return docWithId(doc);
      }
      if (where.email) {
        const snapshot = await firestore
          .collection(COLLECTIONS.USERS)
          .where('email', '==', where.email)
          .limit(1)
          .get();
        return snapshot.empty ? null : docWithId(snapshot.docs[0]);
      }
      return null;
    } catch (error) {
      console.error('Error in userService.findUnique:', error);
      throw error;
    }
  },

  async findMany(params?: { where?: any; select?: any; orderBy?: any; limit?: number }) {
    try {
      let query: any = firestore.collection(COLLECTIONS.USERS);

      if (params?.where) {
        Object.entries(params.where).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.where(key, '==', value);
          }
        });
      }

      if (params?.orderBy) {
        Object.entries(params.orderBy).forEach(([key, value]) => {
          query = query.orderBy(key, value === 'asc' ? 'asc' : 'desc');
        });
      }

      if (params?.limit) {
        query = query.limit(params.limit);
      }

      const snapshot = await query.get();
      const results = snapshot.docs.map(docWithId);

      if (params?.select) {
        return results.map(item => {
          const selected: any = {};
          Object.keys(params.select).forEach(key => {
            if (params.select[key]) {
              selected[key] = item[key];
            }
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

  async count(where?: any) {
    try {
      let query: any = firestore.collection(COLLECTIONS.USERS);

      if (where) {
        Object.entries(where).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.where(key, '==', value);
          }
        });
      }

      const snapshot = await query.get();
      return snapshot.size;
    } catch (error) {
      console.error('Error in userService.count:', error);
      throw error;
    }
  },

  async create(data: any) {
    try {
      const docData = {
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      const docRef = await firestore.collection(COLLECTIONS.USERS).add(docData);
      const doc = await docRef.get();
      return docWithId(doc);
    } catch (error) {
      console.error('Error in userService.create:', error);
      throw error;
    }
  },

  async update(where: { id: string }, data: any) {
    try {
      const docRef = firestore.collection(COLLECTIONS.USERS).doc(where.id);
      await docRef.update({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      });
      const doc = await docRef.get();
      return docWithId(doc);
    } catch (error) {
      console.error('Error in userService.update:', error);
      throw error;
    }
  },

  async updateMany(where: any, data: any) {
    try {
      let query: any = firestore.collection(COLLECTIONS.USERS);

      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          query = query.where(key, '==', value);
        }
      });

      const snapshot = await query.get();
      const batch = firestore.batch();
      let count = 0;

      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          ...data,
          updatedAt: FieldValue.serverTimestamp(),
        });
        count++;
      });

      await batch.commit();
      return { count };
    } catch (error) {
      console.error('Error in userService.updateMany:', error);
      throw error;
    }
  },

  async delete(where: { id: string }) {
    try {
      await firestore.collection(COLLECTIONS.USERS).doc(where.id).delete();
      return { success: true };
    } catch (error) {
      console.error('Error in userService.delete:', error);
      throw error;
    }
  },
};

// ============ DEPARTMENT OPERATIONS ============

export const departmentService = {
  async findMany(params?: { orderBy?: any; include?: any }) {
    try {
      let query: any = firestore.collection(COLLECTIONS.DEPARTMENTS);

      if (params?.orderBy) {
        Object.entries(params.orderBy).forEach(([key, value]) => {
          query = query.orderBy(key, value === 'asc' ? 'asc' : 'desc');
        });
      }

      const snapshot = await query.get();
      return snapshot.docs.map(docWithId);
    } catch (error) {
      console.error('Error in departmentService.findMany:', error);
      throw error;
    }
  },

  async findUnique(where: { id?: string; abbreviation?: string }) {
    try {
      if (where.id) {
        const doc = await firestore.collection(COLLECTIONS.DEPARTMENTS).doc(where.id).get();
        return docWithId(doc);
      }
      if (where.abbreviation) {
        const snapshot = await firestore
          .collection(COLLECTIONS.DEPARTMENTS)
          .where('abbreviation', '==', where.abbreviation)
          .limit(1)
          .get();
        return snapshot.empty ? null : docWithId(snapshot.docs[0]);
      }
      return null;
    } catch (error) {
      console.error('Error in departmentService.findUnique:', error);
      throw error;
    }
  },

  async findFirst(where: any) {
    try {
      let query: any = firestore.collection(COLLECTIONS.DEPARTMENTS);

      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          query = query.where(key, '==', value);
        }
      });

      const snapshot = await query.limit(1).get();
      return snapshot.empty ? null : docWithId(snapshot.docs[0]);
    } catch (error) {
      console.error('Error in departmentService.findFirst:', error);
      throw error;
    }
  },

  async create(data: any) {
    try {
      const docRef = await firestore.collection(COLLECTIONS.DEPARTMENTS).add({
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      const doc = await docRef.get();
      return docWithId(doc);
    } catch (error) {
      console.error('Error in departmentService.create:', error);
      throw error;
    }
  },

  async update(where: { id: string }, data: any) {
    try {
      const docRef = firestore.collection(COLLECTIONS.DEPARTMENTS).doc(where.id);
      await docRef.update({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      });
      const doc = await docRef.get();
      return docWithId(doc);
    } catch (error) {
      console.error('Error in departmentService.update:', error);
      throw error;
    }
  },

  async delete(where: { id: string }) {
    try {
      await firestore.collection(COLLECTIONS.DEPARTMENTS).doc(where.id).delete();
      return { success: true };
    } catch (error) {
      console.error('Error in departmentService.delete:', error);
      throw error;
    }
  },
};

// ============ STAFF OPERATIONS ============

export const staffService = {
  async findUnique(params: { where: { id?: string; userId?: string }; include?: any }) {
    try {
      let doc;
      if (params.where.id) {
        doc = await firestore.collection(COLLECTIONS.STAFF).doc(params.where.id).get();
      } else if (params.where.userId) {
        const snapshot = await firestore
          .collection(COLLECTIONS.STAFF)
          .where('userId', '==', params.where.userId)
          .limit(1)
          .get();
        doc = snapshot.empty ? null : snapshot.docs[0];
      }

      if (!doc || !doc.exists) return null;

      const staffData = docWithId(doc);

      if (params.include?.user && staffData.userId) {
        staffData.user = await userService.findUnique({ id: staffData.userId });
      }

      if (params.include?.department && staffData.departmentId) {
        staffData.department = await departmentService.findUnique({ id: staffData.departmentId });
      }

      if (params.include?.assignments) {
        staffData.assignments = await assignmentService.findMany({
          where: { staffId: staffData.id },
          include: params.include.assignments.include,
        });
      }

      return staffData;
    } catch (error) {
      console.error('Error in staffService.findUnique:', error);
      throw error;
    }
  },

  async findFirst(params: { where: any; include?: any }) {
    try {
      let query: any = firestore.collection(COLLECTIONS.STAFF);

      Object.entries(params.where).forEach(([key, value]) => {
        if (value !== undefined) {
          query = query.where(key, '==', value);
        }
      });

      const snapshot = await query.limit(1).get();
      if (snapshot.empty) return null;

      const staffData = docWithId(snapshot.docs[0]);

      if (params.include?.user && staffData.userId) {
        staffData.user = await userService.findUnique({ id: staffData.userId });
      }

      return staffData;
    } catch (error) {
      console.error('Error in staffService.findFirst:', error);
      throw error;
    }
  },

  async findMany(params?: { where?: any; include?: any; orderBy?: any }) {
    try {
      let query: any = firestore.collection(COLLECTIONS.STAFF);

      if (params?.where) {
        Object.entries(params.where).forEach(([key, value]: any) => {
          if (value !== undefined && typeof value !== 'object') {
            query = query.where(key, '==', value);
          }
        });
      }

      if (params?.orderBy) {
        Object.entries(params.orderBy).forEach(([key, value]) => {
          query = query.orderBy(key, value === 'asc' ? 'asc' : 'desc');
        });
      }

      const snapshot = await query.get();
      const staffList = snapshot.docs.map(docWithId);

      if (params?.include) {
        for (const staff of staffList) {
          if (params.include.user && staff.userId) {
            staff.user = await userService.findUnique({ id: staff.userId });
            
            if (params.where?.user?.role && staff.user?.role !== params.where.user.role.equals) {
              const index = staffList.indexOf(staff);
              staffList.splice(index, 1);
              continue;
            }
          }

          if (params.include.assignments && staff.id) {
            staff.assignments = await assignmentService.findMany({
              where: { staffId: staff.id, ...(params.include.assignments.where || {}) },
              include: params.include.assignments.include,
            });
          }
        }
      }

      return staffList;
    } catch (error) {
      console.error('Error in staffService.findMany:', error);
      throw error;
    }
  },

  async create(data: any) {
    try {
      const docRef = await firestore.collection(COLLECTIONS.STAFF).add({
        userId: data.userId,
        departmentId: data.departmentId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      const doc = await docRef.get();
      return docWithId(doc);
    } catch (error) {
      console.error('Error in staffService.create:', error);
      throw error;
    }
  },

  async updateMany(where: any, data: any) {
    try {
      let query: any = firestore.collection(COLLECTIONS.STAFF);

      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          query = query.where(key, '==', value);
        }
      });

      const snapshot = await query.get();
      const batch = firestore.batch();

      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          ...data,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
      return { count: snapshot.size };
    } catch (error) {
      console.error('Error in staffService.updateMany:', error);
      throw error;
    }
  },

  async deleteMany(where: any) {
    try {
      let query: any = firestore.collection(COLLECTIONS.STAFF);

      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          query = query.where(key, '==', value);
        }
      });

      const snapshot = await query.get();
      const batch = firestore.batch();

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return { count: snapshot.size };
    } catch (error) {
      console.error('Error in staffService.deleteMany:', error);
      throw error;
    }
  },
};

// ============ ACADEMIC YEAR OPERATIONS ============

export const academicYearService = {
  async findMany(params?: { orderBy?: any }) {
    try {
      let query: any = firestore.collection(COLLECTIONS.ACADEMIC_YEARS);

      if (params?.orderBy) {
        Object.entries(params.orderBy).forEach(([key, value]) => {
          query = query.orderBy(key, value === 'asc' ? 'asc' : 'desc');
        });
      }

      const snapshot = await query.get();
      return snapshot.docs.map(docWithId);
    } catch (error) {
      console.error('Error in academicYearService.findMany:', error);
      throw error;
    }
  },

  async findUnique(where: { id: string }) {
    try {
      const doc = await firestore.collection(COLLECTIONS.ACADEMIC_YEARS).doc(where.id).get();
      return docWithId(doc);
    } catch (error) {
      console.error('Error in academicYearService.findUnique:', error);
      throw error;
    }
  },

  async create(data: any) {
    try {
      const docRef = await firestore.collection(COLLECTIONS.ACADEMIC_YEARS).add({
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      const doc = await docRef.get();
      return docWithId(doc);
    } catch (error) {
      console.error('Error in academicYearService.create:', error);
      throw error;
    }
  },

  async upsert(params: { where: any; create: any; update: any }) {
    try {
      const existing = await this.findUnique(params.where);
      if (existing) {
        return await this.update(params.where, params.update);
      }
      return await this.create(params.create);
    } catch (error) {
      console.error('Error in academicYearService.upsert:', error);
      throw error;
    }
  },

  async update(where: { id: string }, data: any) {
    try {
      const docRef = firestore.collection(COLLECTIONS.ACADEMIC_YEARS).doc(where.id);
      await docRef.update({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      });
      const doc = await docRef.get();
      return docWithId(doc);
    } catch (error) {
      console.error('Error in academicYearService.update:', error);
      throw error;
    }
  },
};

// ============ SUBJECT OPERATIONS ============

export const subjectService = {
  async findMany(params?: { orderBy?: any; include?: any; where?: any }) {
    try {
      let query: any = firestore.collection(COLLECTIONS.SUBJECTS);

      if (params?.where) {
        Object.entries(params.where).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.where(key, '==', value);
          }
        });
      }

      if (params?.orderBy) {
        Object.entries(params.orderBy).forEach(([key, value]) => {
          query = query.orderBy(key, value === 'asc' ? 'asc' : 'desc');
        });
      }

      const snapshot = await query.get();
      const subjects = snapshot.docs.map(docWithId);

      if (params?.include?.academicYear) {
        for (const subject of subjects) {
          if (subject.academicYearId) {
            subject.academicYear = await academicYearService.findUnique({ id: subject.academicYearId });
          }
        }
      }

      return subjects;
    } catch (error) {
      console.error('Error in subjectService.findMany:', error);
      throw error;
    }
  },

  async findUnique(where: { id?: string; subjectCode?: string }) {
    try {
      if (where.id) {
        const doc = await firestore.collection(COLLECTIONS.SUBJECTS).doc(where.id).get();
        return docWithId(doc);
      }
      if (where.subjectCode) {
        const snapshot = await firestore
          .collection(COLLECTIONS.SUBJECTS)
          .where('subjectCode', '==', where.subjectCode)
          .limit(1)
          .get();
        return snapshot.empty ? null : docWithId(snapshot.docs[0]);
      }
      return null;
    } catch (error) {
      console.error('Error in subjectService.findUnique:', error);
      throw error;
    }
  },

  async create(data: any) {
    try {
      const docRef = await firestore.collection(COLLECTIONS.SUBJECTS).add({
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      const doc = await docRef.get();
      return docWithId(doc);
    } catch (error) {
      console.error('Error in subjectService.create:', error);
      throw error;
    }
  },

  async update(where: { id: string }, data: any) {
    try {
      const docRef = firestore.collection(COLLECTIONS.SUBJECTS).doc(where.id);
      await docRef.update({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      });
      const doc = await docRef.get();
      return docWithId(doc);
    } catch (error) {
      console.error('Error in subjectService.update:', error);
      throw error;
    }
  },

  async delete(where: { id: string }) {
    try {
      await firestore.collection(COLLECTIONS.SUBJECTS).doc(where.id).delete();
      return { success: true };
    } catch (error) {
      console.error('Error in subjectService.delete:', error);
      throw error;
    }
  },
};

// ============ FACULTY ASSIGNMENT OPERATIONS ============

export const assignmentService = {
  async findMany(params?: { where?: any; include?: any }) {
    try {
      let query: any = firestore.collection(COLLECTIONS.FACULTY_ASSIGNMENTS);

      if (params?.where) {
        Object.entries(params.where).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.where(key, '==', value);
          }
        });
      }

      const snapshot = await query.get();
      const assignments = snapshot.docs.map(docWithId);

      if (params?.include) {
        for (const assignment of assignments) {
          if (params.include.subject && assignment.subjectId) {
            assignment.subject = await subjectService.findUnique({ id: assignment.subjectId });
          }
          if (params.include.feedbacks) {
            assignment.feedbacks = await feedbackService.findMany({
              where: { assignmentId: assignment.id },
            });
          }
        }
      }

      return assignments;
    } catch (error) {
      console.error('Error in assignmentService.findMany:', error);
      throw error;
    }
  },

  async findUnique(where: { id: string }) {
    try {
      const doc = await firestore.collection(COLLECTIONS.FACULTY_ASSIGNMENTS).doc(where.id).get();
      return docWithId(doc);
    } catch (error) {
      console.error('Error in assignmentService.findUnique:', error);
      throw error;
    }
  },

  async createMany(data: { data: any[] }) {
    try {
      const batch = firestore.batch();
      const refs: any[] = [];

      data.data.forEach(item => {
        const docRef = firestore.collection(COLLECTIONS.FACULTY_ASSIGNMENTS).doc();
        batch.set(docRef, {
          ...item,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        refs.push(docRef);
      });

      await batch.commit();
      return { count: data.data.length };
    } catch (error) {
      console.error('Error in assignmentService.createMany:', error);
      throw error;
    }
  },

  async deleteMany(where: any) {
    try {
      let query: any = firestore.collection(COLLECTIONS.FACULTY_ASSIGNMENTS);

      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          query = query.where(key, '==', value);
        }
      });

      const snapshot = await query.get();
      const batch = firestore.batch();

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return { count: snapshot.size };
    } catch (error) {
      console.error('Error in assignmentService.deleteMany:', error);
      throw error;
    }
  },
};

// ============ FEEDBACK OPERATIONS ============

export const feedbackService = {
  async findFirst(where: any) {
    try {
      let query: any = firestore.collection(COLLECTIONS.FEEDBACK);

      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          query = query.where(key, '==', value);
        }
      });

      const snapshot = await query.limit(1).get();
      return snapshot.empty ? null : docWithId(snapshot.docs[0]);
    } catch (error) {
      console.error('Error in feedbackService.findFirst:', error);
      throw error;
    }
  },

  async findMany(params?: { where?: any; include?: any }) {
    try {
      let query: any = firestore.collection(COLLECTIONS.FEEDBACK);

      if (params?.where) {
        Object.entries(params.where).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.where(key, '==', value);
          }
        });
      }

      const snapshot = await query.get();
      return snapshot.docs.map(docWithId);
    } catch (error) {
      console.error('Error in feedbackService.findMany:', error);
      throw error;
    }
  },

  async create(data: any) {
    try {
      const docRef = await firestore.collection(COLLECTIONS.FEEDBACK).add({
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      const doc = await docRef.get();
      return docWithId(doc);
    } catch (error) {
      console.error('Error in feedbackService.create:', error);
      throw error;
    }
  },
};

// ============ HOD SUGGESTION OPERATIONS ============

export const hodSuggestionService = {
  async findUnique(where: any) {
    try {
      if (where.staffId_semester) {
        const { staffId, semester } = where.staffId_semester;
        const snapshot = await firestore
          .collection(COLLECTIONS.HOD_SUGGESTIONS)
          .where('staffId', '==', staffId)
          .where('semester', '==', semester)
          .limit(1)
          .get();
        return snapshot.empty ? null : docWithId(snapshot.docs[0]);
      }
      return null;
    } catch (error) {
      console.error('Error in hodSuggestionService.findUnique:', error);
      return null;
    }
  },

  async findMany(params?: { where?: any }) {
    try {
      let query: any = firestore.collection(COLLECTIONS.HOD_SUGGESTIONS);

      if (params?.where) {
        Object.entries(params.where).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.where(key, '==', value);
          }
        });
      }

      const snapshot = await query.get();
      return snapshot.docs.map(docWithId);
    } catch (error) {
      console.error('Error in hodSuggestionService.findMany:', error);
      throw error;
    }
  },

  async create(data: any) {
    try {
      const docRef = await firestore.collection(COLLECTIONS.HOD_SUGGESTIONS).add({
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      const doc = await docRef.get();
      return docWithId(doc);
    } catch (error) {
      console.error('Error in hodSuggestionService.create:', error);
      throw error;
    }
  },

  async deleteMany(where: any) {
    try {
      let query: any = firestore.collection(COLLECTIONS.HOD_SUGGESTIONS);

      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          query = query.where(key, '==', value);
        }
      });

      const snapshot = await query.get();
      const batch = firestore.batch();

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return { count: snapshot.size };
    } catch (error) {
      console.error('Error in hodSuggestionService.deleteMany:', error);
      throw error;
    }
  },
};

// ============ TRANSACTION HELPER ============

export const transaction = async (callback: (services: any) => Promise<void>) => {
  try {
    await callback({
      user: userService,
      department: departmentService,
      staff: staffService,
      academicYear: academicYearService,
      subject: subjectService,
      facultyAssignment: assignmentService,
      feedback: feedbackService,
      hodSuggestion: hodSuggestionService,
    });
  } catch (error) {
    console.error('Transaction error:', error);
    throw error;
  }
};
