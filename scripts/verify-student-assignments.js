const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'feedbackPortal';

const STUDENTS = {
    CO: {
        'First Year': ['25213070081'],
        'Second Year': ['24213070081'],
        'Third Year': ['23213070081']
    },
    EE: {
        'Second Year': ['23213070244'],
        'Third Year': ['23213070114']
    },
    CE: {
        'Second Year': ['23213070009'],
        'Third Year': ['23213070006']
    },
    ME: {
        'Second Year': ['24213070312'],
        'Third Year': ['2215200219']
    }
};

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
        const yearMap = new Map();
        academicYears.forEach(y => {
            if (y.name.includes('First Year')) yearMap.set('First Year', y._id);
            else if (y.name.includes('Second Year')) yearMap.set('Second Year', y._id);
            else if (y.name.includes('Third Year')) yearMap.set('Third Year', y._id);
        });

        // 3. For each student
        for (const [deptAbbr, yearStudents] of Object.entries(STUDENTS)) {
            const dept = deptMap.get(deptAbbr);
            if (!dept) {
                console.log(`Department ${deptAbbr} not found`);
                continue;
            }

            console.log(`\n=== Department: ${deptAbbr} ===`);

            for (const [yearName, prns] of Object.entries(yearStudents)) {
                const yearId = yearMap.get(yearName);
                if (!yearId) {
                    console.log(`Academic year not found for ${yearName}`);
                    continue;
                }

                for (const prn of prns) {
                    // Get student
                    const student = await db.collection('users').findOne({ email: prn });
                    if (!student) {
                        console.log(`Student not found: ${prn}`);
                        continue;
                    }

                    // Get subject mappings for department and year
                    const deptSubjects = await db.collection('departmentSubjects')
                        .find({ 
                            departmentId: dept._id,
                            academicYearId: yearId
                        }).toArray();

                    // Get assignments
                    const assignments = await db.collection('facultyAssignments')
                        .find({ 
                            departmentId: dept._id,
                            academicYearId: yearId
                        }).toArray();

                    // Get subject details
                    const subjectIds = deptSubjects.map(ds => ds.subjectId);
                    const subjects = await db.collection('subjects')
                        .find({ _id: { $in: subjectIds } })
                        .toArray();
                    const subjectMap = new Map(subjects.map(s => [s._id.toString(), s]));

                    // Get staff details
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

                    console.log(`\nStudent: ${prn} (${yearName})`);
                    console.log(`Subject mappings: ${deptSubjects.length}`);
                    console.log(`Assignments: ${assignments.length}`);
                    console.log('\nAssignments:');
                    
                    for (const a of assignments) {
                        const subject = subjectMap.get(a.subjectId.toString());
                        const staff = staffMap.get(a.staffId.toString());
                        console.log(`- ${subject?.name || 'Unknown Subject'} (${staff?.name || 'Unknown Staff'})`);
                    }
                }
            }
        }

    } finally {
        await client.close();
    }
}

main().catch(console.error);