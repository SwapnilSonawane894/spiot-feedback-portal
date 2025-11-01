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
        const staffProfiles = await db.collection('staff').find({}).toArray();
        const staffUsers = await db.collection('users')
            .find({ _id: { $in: staffProfiles.map(s => s.userId) } })
            .toArray();

        // Map staff to departments
        const staffByDept = new Map();
        for (const staff of staffProfiles) {
            const deptId = staff.departmentId.toString();
            if (!staffByDept.has(deptId)) staffByDept.set(deptId, []);
            staffByDept.get(deptId).push(staff);
        }

        // 4. Get department subject mappings
        const deptSubjects = await db.collection('departmentSubjects').find({}).toArray();

        // 5. Clear existing assignments
        await db.collection('facultyAssignments').deleteMany({});

        // 6. Create assignments for each department and year
        const processedAssignments = new Set(); // Track unique combinations

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

            const deptStaff = staffByDept.get(dept._id.toString()) || [];
            if (deptStaff.length === 0) {
                console.log(`No staff found for department ${deptAbbr}`);
                continue;
            }

            // Create assignments
            const assignments = [];
            let staffIndex = 0;
            let subjectIndex = 0;
            let attempts = 0;
            const maxAttempts = expectedCount * 3; // Avoid infinite loops

            while (assignments.length < expectedCount && attempts < maxAttempts) {
                const subject = subjectsForYear[subjectIndex % subjectsForYear.length];
                const staff = deptStaff[staffIndex % deptStaff.length];

                // Create unique key for this combination
                const assignKey = `${staff._id}-${subject.subjectId}-${yearId}-${semester}`;
                
                if (!processedAssignments.has(assignKey)) {
                    assignments.push({
                        staffId: staff._id,
                        subjectId: subject.subjectId,
                        semester,
                        departmentId: dept._id,
                        academicYearId: yearId,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    processedAssignments.add(assignKey);
                }

                staffIndex++;
                subjectIndex++;
                attempts++;
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

            if (assignments.length === 0) continue;

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

            // Print staff assignments
            const staffAssignments = await db.collection('facultyAssignments')
                .aggregate([
                    { $match: { departmentId: dept._id } },
                    { $group: { _id: '$staffId', count: { $sum: 1 } } }
                ]).toArray();

            console.log('\n  Staff Assignment Distribution:');
            for (const sa of staffAssignments) {
                const staff = staffProfiles.find(s => s._id.toString() === sa._id.toString());
                const user = staff ? staffUsers.find(u => u._id.toString() === staff.userId.toString()) : null;
                console.log(`    - ${user?.name || 'Unknown'}: ${sa.count} assignments`);
            }
        }

    } finally {
        await client.close();
    }
}

main().catch(console.error);