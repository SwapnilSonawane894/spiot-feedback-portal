// This script creates missing junction records in departmentSubjects collection
// for subjects that have a departmentId set but no junction record

const { MongoClient } = require('mongodb');

async function fixDepartmentSubjects() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/feedbackPortal';
    const client = await MongoClient.connect(uri);
    const db = client.db('feedbackPortal');

    try {
        // 1. Get all subjects that have departmentId set
        const subjects = await db.collection('subjects').find({
            departmentId: { $exists: true, $ne: null }
        }).toArray();

        console.log(`Found ${subjects.length} subjects with departmentId`);

        // 2. For each subject, create a junction record if it doesn't exist
        for (const subject of subjects) {
            const subjectId = subject._id.toString();
            const departmentId = subject.departmentId.toString();

            // Check if junction already exists
            const existingJunction = await db.collection('departmentSubjects').findOne({
                subjectId,
                departmentId
            });

            if (!existingJunction) {
                // Create junction record
                const junctionDoc = {
                    subjectId,
                    departmentId,
                    academicYearId: subject.academicYearId ? subject.academicYearId.toString() : null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                await db.collection('departmentSubjects').insertOne(junctionDoc);
                console.log(`Created junction for subject ${subject.name} (${subjectId}) -> department ${departmentId}`);
            }
        }

        // 3. Verify results
        const totalJunctions = await db.collection('departmentSubjects').countDocuments();
        console.log(`\nTotal junction records after fix: ${totalJunctions}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

// Run the fix
fixDepartmentSubjects();