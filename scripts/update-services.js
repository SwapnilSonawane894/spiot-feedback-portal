// @ts-check
import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = 'FeedbackPortal2';

async function updateServices() {
  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  try {
    // 1. Fix any null employeeIds in staff collection
    const staffWithNullEmployeeId = await db.collection('staff').find({ employeeId: null }).toArray();
    for (const staff of staffWithNullEmployeeId) {
      const timestamp = Date.now();
      await db.collection('staff').updateOne(
        { _id: staff._id },
        { $set: { employeeId: `STAFF${timestamp}` } }
      );
    }
    console.log(`Fixed ${staffWithNullEmployeeId.length} staff records with null employeeId`);

    // 2. Ensure there's exactly one global semester settings
    const semesterSettings = await db.collection('settings').find({ type: 'semester' }).toArray();
    
    if (semesterSettings.length === 0) {
      // Create default settings if none exist
      await db.collection('settings').insertOne({
        type: 'semester',
        departmentId: null,
        currentSemester: 1,
        academicYear: `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`,
        updatedAt: new Date(),
      });
      console.log('Created default semester settings');
    } else if (semesterSettings.length > 1) {
      // Keep the most recently updated one and remove others
      semesterSettings.sort((a, b) => b.updatedAt - a.updatedAt);
      const [keep, ...remove] = semesterSettings;
      await db.collection('settings').deleteMany({ 
        _id: { $in: remove.map(s => s._id) } 
      });
      console.log(`Removed ${remove.length} duplicate semester settings`);
    }

    console.log('Service update completed successfully');
  } catch (error) {
    console.error('Error updating services:', error);
  } finally {
    await client.close();
  }
}

updateServices().catch(console.error);