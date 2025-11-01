const { MongoClient } = require('mongodb');

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI environment variable is required');
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('spiot-feedback');

        // Load subjects from backup
        const subjectsData = require('../../backup/2025-10-26T05-44-40-306Z/subjects.json');
        
        // Insert subjects
        const subjectsResult = await db.collection('subjects').insertMany(subjectsData);
        console.log(`✓ Inserted ${subjectsResult.insertedCount} subjects`);

        // Create department-subject mappings
        const departmentSubjects = subjectsData.map(subject => ({
            departmentId: subject.departmentId,
            subjectId: subject._id,
            academicYearId: subject.academicYearId,
            createdAt: new Date(),
            updatedAt: new Date()
        }));

        // If subject has departmentIds array, create mappings for each department
        subjectsData.forEach(subject => {
            if (Array.isArray(subject.departmentIds)) {
                subject.departmentIds.forEach(deptId => {
                    if (deptId !== subject.departmentId) {
                        departmentSubjects.push({
                            departmentId: deptId,
                            subjectId: subject._id,
                            academicYearId: subject.academicYearId,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                    }
                });
            }
        });

        // Insert department-subject mappings
        const mappingsResult = await db.collection('departmentSubjects').insertMany(departmentSubjects);
        console.log(`✓ Created ${mappingsResult.insertedCount} department-subject mappings`);

        console.log('Restore completed successfully!');
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    } finally {
        await client.close();
    }
}

main().catch(console.error);