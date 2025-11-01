import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in .env file');
}

async function fixHodAssignments() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();

  try {
    console.log('Starting HOD assignments fix...');

    // 1. Get all departments
    const departments = await db.collection('departments').find().toArray();
    console.log(`Found ${departments.length} departments`);

    // 2. For each department, ensure only one active HOD
    for (const dept of departments) {
      const hodAssignments = await db.collection('facultyAssignments')
        .find({
          departmentId: new ObjectId(dept._id),
          role: 'hod',
          active: true
        })
        .toArray();

      if (hodAssignments.length > 1) {
        console.log(`Found ${hodAssignments.length} active HODs for department ${dept.name}`);
        
        // Sort by latest assignment
        hodAssignments.sort((a, b) => b.updatedAt - a.updatedAt);
        
        // Keep only the most recent HOD assignment active
        const [currentHod, ...oldHods] = hodAssignments;
        
        // Deactivate old HOD assignments
        for (const oldHod of oldHods) {
          await db.collection('facultyAssignments').updateOne(
            { _id: oldHod._id },
            { 
              $set: { 
                active: false,
                updatedAt: new Date(),
                deactivatedAt: new Date(),
                deactivationReason: 'Automated fix - Multiple active HODs found'
              }
            }
          );
          console.log(`Deactivated old HOD assignment for department ${dept.name}`);
        }
      } else if (hodAssignments.length === 0) {
        console.log(`No active HOD found for department ${dept.name}`);
      } else {
        console.log(`Department ${dept.name} has exactly one active HOD - OK`);
      }
    }

    // 3. Create unique index on employeeId for active HOD assignments
    await db.collection('facultyAssignments').createIndex(
      { 
        employeeId: 1,
        role: 1,
        active: 1
      },
      { 
        unique: true,
        partialFilterExpression: {
          role: 'hod',
          active: true
        },
        name: 'unique_active_hod_per_employee'
      }
    );

    console.log('Successfully created unique index for active HOD assignments');
    console.log('HOD assignments fix completed successfully');

  } catch (error) {
    console.error('Error fixing HOD assignments:', error);
    throw error;
  } finally {
    await client.close();
  }
}

fixHodAssignments()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });