const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'feedbackPortal';

// Required assignment counts
const ASSIGNMENT_COUNTS = {
    'CO-FY': 14,
    'CO-SY': 6,
    'CO-TY': 5,
    'EE-SY': 7,
    'EE-TY': 6,
    'CE-SY': 7,
    'CE-TY': 6,
    'ME-SY': 9,
    'ME-TY': 5
};

async function getCurrentSemester() {
    const now = new Date();
    const isOdd = now.getMonth() >= 6; // After June = Odd semester
    return `${isOdd ? 'Odd' : 'Even'} Semester ${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(-2)}`;
}

// Staff department mapping
const STAFF_EMAILS = {
    CO: [
        'bhosale@gmail.com',
        'rajwade@gmail.com',
        'wagh@gmail.com',
        'kadam@gmail.com',
        'kamble@gmail.com'
    ],
    EE: [
        'raut@gmail.com'
    ],
    CE: [
        'hajare@gmail.com'
    ],
    ME: [
        'pawar@gmail.com',
        'bhoite2@gmail.com'
    ]
};

async function main() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    try {
        const semester = await getCurrentSemester();

        // 1. Get all departments
        const departments = await db.collection('departments').find({}).toArray();
        const deptMap = new Map(departments.map(d => [d.abbreviation, d]));

        // 2. Get academic years
        const academicYears = await db.collection('academicYears').find({}).toArray();
        const yearMap = new Map();
        academicYears.forEach(y => {
            const deptAbbr = y.name.includes('Computer') ? 'CO' :
                           y.name.includes('Mechanical') ? 'ME' :
                           y.name.includes('Electrical') ? 'EE' :
                           y.name.includes('Civil') ? 'CE' : null;
            
            if (deptAbbr) {
                const key = `${deptAbbr}-${y.name.includes('First') ? 'FY' : 
                                         y.name.includes('Second') ? 'SY' :
                                         y.name.includes('Third') ? 'TY' : ''}`;
                yearMap.set(key, y._id);
            }
        });

        // 3. Get staff members
        const staffMembers = await db.collection('users').find({ email: { $in: Object.values(STAFF_EMAILS).flat() } }).toArray();
        const staffProfiles = await db.collection('staff').find({ userId: { $in: staffMembers.map(u => u._id) } }).toArray();
        
        // Map staff to departments
        const staffByDept = {};
        for (const [dept, emails] of Object.entries(STAFF_EMAILS)) {
            staffByDept[dept] = [];
            for (const email of emails) {
                const user = staffMembers.find(u => u.email === email);
                if (!user) continue;
                const profile = staffProfiles.find(p => p.userId.toString() === user._id.toString());
                if (profile) staffByDept[dept].push(profile);
            }
        }

        // 4. Get department subject mappings
        const deptSubjects = await db.collection('departmentSubjects').find({}).toArray();

        // 5. Clear existing assignments
        await db.collection('facultyAssignments').deleteMany({});

        // 6. Create assignments for each department and year
        for (const [key, expectedCount] of Object.entries(ASSIGNMENT_COUNTS)) {
            const [deptAbbr, yearAbbr] = key.split('-');
            const dept = deptMap.get(deptAbbr);
            if (!dept) {
                console.log(`Department ${deptAbbr} not found`);
                continue;
            }

            const yearId = yearMap.get(key);
            if (!yearId) {
                console.log(`Academic year not found for ${key}`);
                continue;
            }

            // Get subjects for this department and year
            const subjectsForYear = deptSubjects.filter(ds => 
                ds.departmentId.toString() === dept._id.toString() &&
                ds.academicYearId.toString() === yearId.toString()
            );

            if (subjectsForYear.length === 0) {
                console.log(`No subjects found for ${key}`);
                continue;
            }

            const deptStaff = staffByDept[deptAbbr] || [];
            if (deptStaff.length === 0) {
                console.log(`No staff found for department ${deptAbbr}`);
                continue;
            }

            // Create assignments
            const assignments = [];
            let staffIndex = 0;
            let subjectIndex = 0;
            let remaining = expectedCount;

            while (remaining > 0) {
                const subject = subjectsForYear[subjectIndex % subjectsForYear.length];
                const staff = deptStaff[staffIndex % deptStaff.length];

                assignments.push({
                    staffId: staff._id,
                    subjectId: subject.subjectId,
                    semester,
                    departmentId: dept._id,
                    academicYearId: yearId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                staffIndex++;
                subjectIndex++;
                remaining--;
            }

            // Insert assignments
            if (assignments.length > 0) {
                const result = await db.collection('facultyAssignments').insertMany(assignments);
                console.log(`Created ${result.insertedCount} assignments for ${key}`);
            }
        }

        // 7. Print final results
        console.log('\nAssignment Distribution:');
        for (const [deptAbbr, dept] of deptMap) {
            const assignments = await db.collection('facultyAssignments')
                .find({ departmentId: dept._id })
                .toArray();

            console.log(`\nDepartment ${deptAbbr}:`);
            
            // Group by academic year
            const byYear = assignments.reduce((acc, a) => {
                const yearId = a.academicYearId.toString();
                if (!acc[yearId]) acc[yearId] = 0;
                acc[yearId]++;
                return acc;
            }, {});

            for (const [yearId, count] of Object.entries(byYear)) {
                const year = academicYears.find(y => y._id.toString() === yearId);
                console.log(`  ${year?.name}: ${count} assignments`);
            }
        }

    } finally {
        await client.close();
    }
}

main().catch(console.error);