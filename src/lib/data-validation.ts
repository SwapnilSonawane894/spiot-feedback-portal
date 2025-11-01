import { ObjectId } from 'mongodb';
import { getDatabase } from './mongodb';
import { COLLECTIONS } from './mongodb-services';

export async function validateDepartmentExists(departmentId: string): Promise<boolean> {
  try {
    const db = await getDatabase();
    const department = await db.collection(COLLECTIONS.DEPARTMENTS).findOne({
      _id: new ObjectId(departmentId)
    });
    return !!department;
  } catch (error) {
    console.error('Error validating department:', error);
    return false;
  }
}

export async function validateUserExists(userId: string): Promise<boolean> {
  try {
    const db = await getDatabase();
    const user = await db.collection(COLLECTIONS.USERS).findOne({
      _id: new ObjectId(userId)
    });
    return !!user;
  } catch (error) {
    console.error('Error validating user:', error);
    return false;
  }
}

export async function normalizeId(id: string | ObjectId): Promise<string> {
  if (id instanceof ObjectId) return id.toString();
  return id;
}

export async function validateEmailUnique(email: string, excludeUserId?: string): Promise<boolean> {
  try {
    const db = await getDatabase();
    const query: any = { email };
    if (excludeUserId) {
      query._id = { $ne: new ObjectId(excludeUserId) };
    }
    const existingUser = await db.collection(COLLECTIONS.USERS).findOne(query);
    return !existingUser;
  } catch (error) {
    console.error('Error validating email uniqueness:', error);
    return false;
  }
}

export async function validateStaffAssignments(staffId: string): Promise<boolean> {
  try {
    const db = await getDatabase();
    const assignments = await db.collection(COLLECTIONS.FACULTY_ASSIGNMENTS).find({
      staffId: staffId
    }).toArray();
    
    return assignments.length > 0;
  } catch (error) {
    console.error('Error validating staff assignments:', error);
    return false;
  }
}