const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'feedbackPortal';

async function main() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    try {
        // 1. Verify departments exist
        const departments = await db.collection('departments').find({}).toArray();
        console.log('Found departments:', departments.map(d => ({ id: d._id.toString(), name: d.name })));

        // 2. Get ME department
        const meDept = departments.find(d => d.abbreviation === 'ME');
        if (!meDept) {
            throw new Error('ME department not found');
        }
        console.log('ME Department:', { id: meDept._id.toString(), name: meDept.name });

        // 3. Get Academic Years
        const academicYears = await db.collection('academicYears').find({}).toArray();
        const yearMap = new Map(academicYears.map(y => [y._id.toString(), y]));
        
        // Academic year ID lookup map based on your data
        const yearLookup = {
            'TYME': '68f63990dc335227e2601fe2', // TY
            'SYME': '68f63980dc335227e2601fe1', // SY 
            'FYME': '68f63976dc335227e2601fe0'  // FY
        };

        // Expected assignment counts
        const expectedCounts = {
            'TYME': 5,
            'SYME': 9
        };

        // 4. Fix ME student academic years
        const meStudents = [
            { prn: '2215200219', year: 'TYME' },
            { prn: '24213070312', year: 'SYME' }
        ];

        for (const student of meStudents) {
            const yearId = yearLookup[student.year];
            if (!yearId) continue;

            const updated = await db.collection('users').updateOne(
                { email: student.prn },
                { 
                    $set: { 
                        academicYearId: new ObjectId(yearId),
                        departmentId: meDept._id
                    } 
                }
            );
            console.log(`Updated student ${student.prn}:`, updated.modifiedCount);
        }

        // 5. Get existing department-subject mappings for ME
        const existingMappings = await db.collection('departmentSubjects')
            .find({ departmentId: meDept._id }).toArray();
        
        console.log('Current ME subject mappings:', existingMappings.length);

        // 6. Verify assignments
        const assignments = await db.collection('facultyAssignments')
            .find({ departmentId: meDept._id }).toArray();

        const assignmentsByYear = assignments.reduce((acc, a) => {
            const year = a.academicYearId?.toString();
            if (!acc[year]) acc[year] = [];
            acc[year].push(a);
            return acc;
        }, {});

        console.log('\nME Assignments by year:');
        Object.entries(assignmentsByYear).forEach(([yearId, assigns]) => {
            const year = yearMap.get(yearId);
            console.log(`${year?.name || yearId}: ${assigns.length} assignments`);
        });

        // 7. Report status
        console.log('\nStatus Report:');
        Object.entries(expectedCounts).forEach(([year, expected]) => {
            const yearId = yearLookup[year];
            const actual = assignmentsByYear[yearId]?.length || 0;
            console.log(`${year}: Expected ${expected}, Found ${actual}`);
        });

    } finally {
        await client.close();
    }
}

main().catch(console.error);