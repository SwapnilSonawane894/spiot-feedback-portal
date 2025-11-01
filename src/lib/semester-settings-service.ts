// semesterSettingsService.ts

import { ObjectId } from 'mongodb';
import { getDatabase } from './mongodb';
import { COLLECTIONS } from './mongodb-services';

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
          departmentId: null // Explicitly set to null for global settings
        };

        // Use updateOne with upsert instead of insertOne to avoid race conditions
        await db.collection(COLLECTIONS.SETTINGS).updateOne(
          { type: 'semester', departmentId: null },
          { $setOnInsert: defaultSettings },
          { upsert: true }
        );

        const updatedDoc = await db.collection(COLLECTIONS.SETTINGS).findOne({ type: 'semester', departmentId: null });
        if (!updatedDoc) {
          throw new Error('Failed to retrieve semester settings after creation');
        }
        return {
          id: updatedDoc._id.toString(),
          ...defaultSettings
        };
      }
      return {
        id: doc._id.toString(),
        ...doc
      };
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
        departmentId: null // Ensure global settings
      };
      if (data.academicYear) updateData.academicYear = data.academicYear;
      
      await db.collection(COLLECTIONS.SETTINGS).updateOne(
        { type: 'semester', departmentId: null },
        { $set: updateData },
        { upsert: true }
      );
      
      return this.get();
    } catch (error) {
      console.error('Error in semesterSettingsService.update:', error);
      throw error;
    }
  }
};