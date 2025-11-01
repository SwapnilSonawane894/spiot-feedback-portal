// @ts-check
import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = 'FeedbackPortal2';

async function setupIndexes() {
  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  try {
    // 1. Ensure employeeId is unique in staff collection
    await db.collection('staff').createIndex(
      { employeeId: 1 },
      { unique: true, sparse: true }
    );
    console.log('Created unique index on staff.employeeId');

    // 2. Ensure settings have unique combination of type and departmentId
    await db.collection('settings').createIndex(
      { type: 1, departmentId: 1 },
      { unique: true }
    );
    console.log('Created unique compound index on settings.type and settings.departmentId');

    console.log('Index setup completed successfully');
  } catch (error) {
    console.error('Error setting up indexes:', error);
  } finally {
    await client.close();
  }
}

setupIndexes().catch(console.error);