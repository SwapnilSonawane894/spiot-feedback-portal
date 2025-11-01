const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'feedbackPortal';

const STUDENTS = [
    { prn: '25213070081', dept: 'CO', year: 'First Year Computer Engineering' },
    { prn: '24213070081', dept: 'CO', year: 'Second Year Computer Engineering' },
    { prn: '23213070081', dept: 'CO', year: 'Third Year Computer Engineering' },
    { prn: '23213070244', dept: 'EE', year: 'Second Year Electrical Engineering' },
    { prn: '23213070114', dept: 'EE', year: 'Third Year Electrical Engineering' },
    { prn: '23213070009', dept: 'CE', year: 'Second Year Civil Engineering' },
    { prn: '23213070006', dept: 'CE', year: 'Third Year Civil Engineering' },
    { prn: '24213070312', dept: 'ME', year: 'Second Year Mechanical Engineering' },
    { prn: '2215200219', dept: 'ME', year: 'Third Year Mechanical Engineering' }
];

async function main() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    try {
        // 1. Get departments
        const departments = await db.collection('departments').find({}).toArray();
        const deptMap = new Map(departments.map(d => [d.abbreviation, d]));

        // 2. Get academic years
        const academicYears = await db.collection('academicYears').find({}).toArray();
        console.log('\nAcademic Years in database:');
        academicYears.forEach(y => console.log(`${y.name}: ${y._id}`));

        // 3. Create or update student records
        console.log('\nUpdating student records:');
        for (const student of STUDENTS) {
            const dept = deptMap.get(student.dept);
            if (!dept) {
                console.log(`Department ${student.dept} not found for ${student.prn}`);
                continue;
            }

            const year = academicYears.find(y => y.name === student.year);
            if (!year) {
                console.log(`Academic year ${student.year} not found for ${student.prn}`);
                continue;
            }

            // Create or update user
            const result = await db.collection('users').updateOne(
                { email: student.prn },
                { 
                    $set: {
                        email: student.prn,
                        role: 'STUDENT',
                        departmentId: dept._id,
                        academicYearId: year._id,
                        updatedAt: new Date()
                    },
                    $setOnInsert: {
                        createdAt: new Date()
                    }
                },
                { upsert: true }
            );

            console.log(`Student ${student.prn}: ${result.upsertedId ? 'Created' : 'Updated'}`);
        }

        // 4. Verify subject mappings and assignments
        console.log('\nVerifying assignments:');
        for (const student of STUDENTS) {
            const dept = deptMap.get(student.dept);
            const year = academicYears.find(y => y.name === student.year);
            if (!dept || !year) continue;

            // Get subject mappings
            const deptSubjects = await db.collection('departmentSubjects')
                .find({ 
                    departmentId: dept._id,
                    academicYearId: year._id 
                }).toArray();

            // Get assignments
            const assignments = await db.collection('facultyAssignments')
                .find({ 
                    departmentId: dept._id,
                    academicYearId: year._id
                }).toArray();

            // Get subjects
            const subjectIds = deptSubjects.map(ds => ds.subjectId);
            const subjects = await db.collection('subjects')
                .find({ _id: { $in: subjectIds } })
                .toArray();
            const subjectMap = new Map(subjects.map(s => [s._id.toString(), s]));

            // Get staff
            const staffIds = assignments.map(a => a.staffId);
            const staffProfiles = await db.collection('staff')
                .find({ _id: { $in: staffIds } })
                .toArray();
            const staffUsers = await db.collection('users')
                .find({ _id: { $in: staffProfiles.map(s => s.userId) } })
                .toArray();
            const staffMap = new Map();
            staffProfiles.forEach(sp => {
                const user = staffUsers.find(u => u._id.toString() === sp.userId.toString());
                if (user) staffMap.set(sp._id.toString(), user);
            });

            console.log(`\nStudent: ${student.prn} (${student.year})`);
            console.log(`Department: ${student.dept}`);
            console.log(`Subject mappings: ${deptSubjects.length}`);
            console.log(`Assignments: ${assignments.length}`);

            if (deptSubjects.length > 0) {
                console.log('\nSubjects:');
                subjects.forEach(s => console.log(`- ${s.name}`));
            }

            if (assignments.length > 0) {
                console.log('\nAssignments:');
                for (const a of assignments) {
                    const subject = subjectMap.get(a.subjectId.toString());
                    const staff = staffMap.get(a.staffId.toString());
                    console.log(`- ${subject?.name || 'Unknown Subject'} (${staff?.name || 'Unknown Staff'})`);
                }
            }
        }

    } finally {
        await client.close();
    }
}

main().catch(console.error);